const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration for the Flask web interface
const WEB_INTERFACE_CONFIG = {
    host: '127.0.0.1',
    port: 8080,
    baseUrl: null
};

// Initialize base URL
WEB_INTERFACE_CONFIG.baseUrl = `http://${WEB_INTERFACE_CONFIG.host}:${WEB_INTERFACE_CONFIG.port}`;

// Global configuration for the current operation
let OPERATION_CONFIG = {
    database: 'OP7',
    dataFile: null,
    displayName: null
};

// Updated Database configuration mapping - added OP8 and made more flexible
const DATABASE_CONFIGS = {
    'OP1': {
        dataFile: 'donetsk_oblast.json',
        displayName: 'Donetsk Oblast',
        description: 'Ukrainian Donetsk Oblast military database'
    },
    'OP2': {
        dataFile: 'dnipropetrovsk.json',
        displayName: 'Dnipropetrovsk Oblast',
        description: 'Ukrainian Dnipropetrovsk Oblast military database'
    },
    'OP3': {
        dataFile: 'Zaporizhzhia_oblast.json',
        displayName: 'Zaporizhzhia Oblast',
        description: 'Ukrainian Zaporizhzhia Oblast military database'
    },
    'OP4': {
        dataFile: 'kyiv_oblast.json',
        displayName: 'Kyiv Oblast',
        description: 'Ukrainian Kyiv Oblast military database'
    },
    'OP5': {
        dataFile: 'kirovohrad_oblast.json',
        displayName: 'Kirovohrad Oblast',
        description: 'Ukrainian Kirovohrad Oblast military database'
    },
    'OP6': {
        dataFile: 'mykolaiv_oblast.json',
        displayName: 'Mykolaiv Oblast',
        description: 'Ukrainian Mykolaiv Oblast military database'
    },
    'OP7': {
        dataFile: 'odesa_oblast.json',
        displayName: 'Odesa Oblast',
        description: 'Ukrainian Odesa Oblast military database'
    },
    'OP8': {
        dataFile: 'sumy_oblast.json',
        displayName: 'Sumy Oblast',
        description: 'Ukrainian Sumy Oblast military database'
    }
};

// Function to initialize operation configuration
function initializeOperationConfig(database) {
    OPERATION_CONFIG.database = database;
    
    const dbConfig = DATABASE_CONFIGS[database];
    if (dbConfig) {
        OPERATION_CONFIG.dataFile = dbConfig.dataFile;
        OPERATION_CONFIG.displayName = dbConfig.displayName;
    } else {
        // Fallback for unknown databases
        OPERATION_CONFIG.dataFile = `${database.toLowerCase()}.json`;
        OPERATION_CONFIG.displayName = database;
    }
    
    console.log(`🎯 Targeting database: ${OPERATION_CONFIG.database} (${OPERATION_CONFIG.displayName})`);
    console.log(`📁 Data file: ${OPERATION_CONFIG.dataFile}`);
}

// Function to get available databases from the web interface
async function getAvailableDatabases() {
    try {
        const response = await axios.get(`${WEB_INTERFACE_CONFIG.baseUrl}/api/databases`, {
            timeout: 5000
        });
        return response.data.databases || [];
    } catch (error) {
        console.warn('⚠️ Could not retrieve available databases from web interface');
        return Object.keys(DATABASE_CONFIGS);
    }
}

// Function to check if web interface is running
async function checkWebInterface() {
    try {
        const response = await axios.get(`${WEB_INTERFACE_CONFIG.baseUrl}/api/databases`, {
            timeout: 5000
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Function to reload the specified database via API
async function reloadDatabase() {
    try {
        console.log(`🔄 Reloading ${OPERATION_CONFIG.displayName} database via web interface...`);
        
        const response = await axios.post(`${WEB_INTERFACE_CONFIG.baseUrl}/api/load_database`, {
            database_name: OPERATION_CONFIG.database
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'success') {
            console.log(`✅ Successfully reloaded ${OPERATION_CONFIG.database} database`);
            console.log('📊 Entity counts:', response.data.entity_counts);
            return true;
        } else {
            console.error('❌ Failed to reload database:', response.data.message);
            return false;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Could not connect to web interface. Is it running?');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('❌ Timeout while reloading database');
        } else {
            console.error('❌ Error reloading database:', error.message);
        }
        return false;
    }
}

// Function to trigger a fresh analysis with the updated data
async function refreshCurrentQuery() {
    try {
        console.log('🔍 Refreshing current analysis with updated data...');
        
        // Trigger a new analysis of the specified database
        const response = await axios.post(`${WEB_INTERFACE_CONFIG.baseUrl}/api/analyze`, {
            database_name: OPERATION_CONFIG.database,
            layout: 'spring',
            show_labels: true,
            filters: {}
        }, {
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'success') {
            console.log('✅ Successfully refreshed analysis');
            console.log(`📈 Updated graph: ${response.data.node_count} nodes, ${response.data.edge_count} edges`);
            
            // Also trigger comprehensive report refresh if needed
            await refreshComprehensiveReport();
            return true;
        } else {
            console.error('❌ Failed to refresh analysis:', response.data.message);
            return false;
        }
    } catch (error) {
        if (error.code === 'ETIMEDOUT') {
            console.error('❌ Timeout while refreshing analysis');
        } else {
            console.error('❌ Error refreshing analysis:', error.message);
        }
        return false;
    }
}

// Function to refresh comprehensive report
async function refreshComprehensiveReport() {
    try {
        console.log('📊 Refreshing comprehensive report...');
        
        const response = await axios.get(`${WEB_INTERFACE_CONFIG.baseUrl}/api/comprehensive_report`, {
            timeout: 60000
        });

        if (response.data.status === 'success') {
            console.log('✅ Comprehensive report refreshed');
            return true;
        } else {
            console.error('❌ Failed to refresh comprehensive report:', response.data.message);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Could not refresh comprehensive report:', error.message);
        return false;
    }
}

// Function to clear any cached data that might contain the brigade
async function clearCachedData() {
    try {
        console.log('🗑️ Clearing any cached analysis data...');
        
        // Try to get fresh filter suggestions (this will rebuild internal caches)
        await axios.get(`${WEB_INTERFACE_CONFIG.baseUrl}/api/filter_suggestions?database=${OPERATION_CONFIG.database}`, {
            timeout: 10000
        });
        
        console.log('✅ Cache clearing completed');
        return true;
    } catch (error) {
        console.warn('⚠️ Could not clear cached data:', error.message);
        return false;
    }
}

// Function to detect the correct data directory path
function findDataDirectory() {
    const possiblePaths = [
        path.join('/home/runner/work/IES/IES', 'data'),
        path.join(process.cwd(), '..', '..', '..', 'data'),
        path.join('C:', 'ies4-military-database-analysis', 'data'),
        path.join(process.cwd(), 'data'),
        path.join(process.cwd(), '..', 'data'),
        path.join(process.cwd(), '..', '..', 'data'),
        path.join(process.cwd(), 'ies4-military-database-analysis', 'data'),
        path.join('C:', 'ies4-military-database-analysis', 'src', 'data'),
        path.join('C:', 'ies4-military-database-analysis', 'backend', 'data')
    ];
    
    console.log('🔍 Searching for data directory...');
    
    for (const testPath of possiblePaths) {
        console.log(`   Testing: ${testPath}`);
        if (fs.existsSync(testPath)) {
            console.log(`   ✅ Found data directory: ${testPath}`);
            return testPath;
        } else {
            console.log(`   ❌ Not found: ${testPath}`);
        }
    }
    
    console.log('⚠️ No data directory found, using default path');
    return path.join('C:', 'ies4-military-database-analysis', 'data');
}

// Function to backup the file before modification
function backupFile() {
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.join(dataDir, 
        `${path.basename(OPERATION_CONFIG.dataFile, '.json')}_backup_${timestamp}.json`);
    
    try {
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, backupPath);
            console.log(`💾 Backup created: ${backupPath}`);
            return backupPath;
        } else {
            console.warn(`⚠️ Source file not found for backup: ${filePath}`);
        }
    } catch (error) {
        console.warn('⚠️ Could not create backup:', error.message);
    }
    return null;
}

// Function to add 35th Guards Motor Rifle Brigade to the JSON data
function add35GdsMRBde() {
    // Define the file path using findDataDirectory
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    
    console.log(`📂 Using data directory: ${dataDir}`);
    console.log(`📁 Target file path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log('📊 Current file structure:');
    console.log(`   Areas: ${data.areas ? data.areas.length : 0}`);
    console.log(`   Military Units: ${data.militaryUnits ? data.militaryUnits.length : 0}`);
    console.log(`   Vehicles: ${data.vehicles ? data.vehicles.length : 0}`);
    console.log(`   Aircraft: ${data.aircraft ? data.aircraft.length : 0}`);
    console.log(`   Unit Types: ${data.unitTypes ? data.unitTypes.length : 0}`);
    
    // Generate unique ID based on database
    const brigadeId = `unit-35-gds-mrb-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the 35th Guards Motor Rifle Brigade entry following IES4 schema
    const guardsBrigade = {
        "id": brigadeId,
        "uri": "https://en.wikipedia.org/wiki/37th_Separate_Guards_Motor_Rifle_Brigade",
        "type": "MilitaryUnit",
        "names": [
            {
                "value": "35th Guards Motor Rifle Brigade",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "35-я гвардейская мотострелковая бригада",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "35 ГвМСБр",
                "language": "ru",
                "nameType": "abbreviation"
            }
        ],
        "identifiers": [
            {
                "value": "35th Guards Motor Rifle Brigade",
                "identifierType": "UNIT_DESIGNATION",
                "issuingAuthority": "Russian Armed Forces"
            },
            {
                "value": "в/ч 52946",
                "identifierType": "MILITARY_UNIT_NUMBER",
                "issuingAuthority": "Russian Ministry of Defense"
            }
        ],
        "unitType": "motor-rifle-brigade",
        "branch": "Ground Forces",
        "formation": "Russian Armed Forces",
        "country": "Russian Federation",
        "status": "active",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "37th-brigade-wiki",
                "type": "webpage",
                "title": "37th Separate Guards Motor Rifle Brigade - Wikipedia",
                "description": "Wikipedia article about similar Guards Motor Rifle Brigade structure",
                "url": "https://en.wikipedia.org/wiki/37th_Separate_Guards_Motor_Rifle_Brigade"
            }
        ],
        "temporalParts": [
            {
                "id": "35gds-formation",
                "stateType": "unit_formation",
                "startTime": "1995-01-01T00:00:00Z",
                "location": "Russian Federation"
            },
            {
                "id": "35gds-guards-status",
                "stateType": "guards_designation_awarded",
                "startTime": "1995-01-01T00:00:00Z",
                "location": "Russian Federation"
            },
            {
                "id": `35gds-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            },
            {
                "id": "35gds-current-operations",
                "stateType": "active_operations",
                "startTime": "2022-02-24T00:00:00Z",
                "location": "Ukraine"
            }
        ],
        "states": [
            {
                "id": `35gds-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            },
            {
                "id": "35gds-combat-ready",
                "stateType": "combat_ready",
                "startTime": "1995-01-01T00:00:00Z",
                "location": "Russian Federation"
            }
        ],
        // Additional brigade-specific properties
        "specifications": {
            "unitSize": "Brigade",
            "personnel": "~3,000-4,000",
            "classification": "Motor Rifle Brigade",
            "subordination": "Combined Arms Army",
            "guardsStatus": "Guards Unit",
            "primaryRole": "Combined arms operations",
            "deploymentRegion": OPERATION_CONFIG.displayName,
            "equipment": [
                "T-72B3/T-80BV main battle tanks",
                "BMP-2/BMP-3 infantry fighting vehicles",
                "BTR-80/BTR-82A armored personnel carriers",
                "2S1 Gvozdika self-propelled howitzers",
                "BM-21 Grad multiple rocket launchers",
                "9K35 Strela-10 air defense systems"
            ]
        },
        "structure": {
            "headquarters": "Brigade Headquarters",
            "subordinateUnits": [
                "3x Motor Rifle Battalions",
                "1x Tank Battalion", 
                "1x Artillery Battalion",
                "1x Air Defense Battery",
                "1x Engineer Company",
                "1x Signal Company",
                "1x Medical Company",
                "1x Supply Company"
            ]
        },
        "honors": [
            "Guards designation",
            "Order of the Red Banner"
        ]
    };
    
    // Create unit type definition for motor rifle brigades
    const motorRifleBrigadeType = {
        "id": "motor-rifle-brigade",
        "name": "Motor Rifle Brigade",
        "category": "ground forces unit",
        "subcategory": "combined arms brigade",
        "description": "Combined arms formation designed for independent operations",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "combined_arms_operations",
                "dataType": "string"
            },
            {
                "name": "personnel_strength",
                "value": "3500",
                "dataType": "number"
            },
            {
                "name": "unit_level",
                "value": "brigade",
                "dataType": "string"
            },
            {
                "name": "branch",
                "value": "ground_forces",
                "dataType": "string"
            },
            {
                "name": "guards_status",
                "value": "true",
                "dataType": "boolean"
            }
        ]
    };
    
    // Add militaryUnits array if it doesn't exist
    if (!data.militaryUnits) {
        data.militaryUnits = [];
        console.log('📋 Created militaryUnits array');
    }
    
    // Add unitTypes array if it doesn't exist
    if (!data.unitTypes) {
        data.unitTypes = [];
        console.log('📋 Created unitTypes array');
    }
    
    // Check if 35th Guards Motor Rifle Brigade already exists
    const existingBrigade = data.militaryUnits.find(u => 
        u.id.includes('unit-35-gds-mrb') || 
        (u.names && u.names.some(name => 
            name.value.includes('35th Guards Motor Rifle Brigade') || 
            name.value.includes('35-я гвардейская мотострелковая бригада')
        ))
    );
    
    if (existingBrigade) {
        console.log(`ℹ️ 35th Guards Motor Rifle Brigade already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.militaryUnits.findIndex(u => u.id === existingBrigade.id);
        data.militaryUnits[index] = { ...guardsBrigade, id: existingBrigade.id };
    } else {
        // Add the brigade to the militaryUnits array
        console.log('➕ Adding new 35th Guards Motor Rifle Brigade...');
        data.militaryUnits.push(guardsBrigade);
    }
    
    // Add the unit type if it doesn't already exist
    const existingUnitType = data.unitTypes.find(ut => ut.id === "motor-rifle-brigade");
    if (!existingUnitType) {
        data.unitTypes.push(motorRifleBrigadeType);
    }
    
    // Write the updated data back to the file
    console.log('💾 Writing updated data to file...');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('✅ File written successfully');
    
    console.log(`✅ Successfully added 35th Guards Motor Rifle Brigade to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added unit ID:', guardsBrigade.id);
    console.log('🏷️ Unit type added:', motorRifleBrigadeType.id);
    
    // Verify the write
    console.log('🔍 Verifying write operation...');
    const verifyContent = fs.readFileSync(filePath, 'utf8');
    const verifyData = JSON.parse(verifyContent);
    console.log(`📊 Verified file structure:`);
    console.log(`   Areas: ${verifyData.areas ? verifyData.areas.length : 0}`);
    console.log(`   Military Units: ${verifyData.militaryUnits ? verifyData.militaryUnits.length : 0}`);
    console.log(`   Unit Types: ${verifyData.unitTypes ? verifyData.unitTypes.length : 0}`);
    
    return data;
}

// Function to remove 35th Guards Motor Rifle Brigade from the JSON data
function remove35GdsMRBde() {
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return false;
        }
        
        // Read the existing JSON file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let removedCount = 0;
        let removedUnitType = false;
        
        // Remove 35th Guards Motor Rifle Brigade from militaryUnits array
        if (data.militaryUnits && Array.isArray(data.militaryUnits)) {
            const initialLength = data.militaryUnits.length;
            data.militaryUnits = data.militaryUnits.filter(unit => {
                // Check multiple possible identifiers for the brigade
                const is35GdsBrigade = 
                    unit.id.includes('unit-35-gds-mrb') ||
                    (unit.names && unit.names.some(name => 
                        name.value.includes('35th Guards Motor Rifle Brigade') || 
                        name.value.includes('35-я гвардейская мотострелковая бригада') ||
                        name.value.includes('35 ГвМСБр')
                    )) ||
                    (unit.identifiers && unit.identifiers.some(id => 
                        id.value.includes('35th Guards Motor Rifle Brigade') ||
                        id.value.includes('в/ч 52946')
                    ));
                
                return !is35GdsBrigade;
            });
            
            removedCount = initialLength - data.militaryUnits.length;
        }
        
        // Check if we should remove the motor rifle brigade type
        // (only if no other motor rifle brigades remain)
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
            const hasOtherMotorRifleBrigades = data.militaryUnits && data.militaryUnits.some(unit => 
                unit.unitType === 'motor-rifle-brigade'
            );
            
            if (!hasOtherMotorRifleBrigades) {
                const initialTypeLength = data.unitTypes.length;
                data.unitTypes = data.unitTypes.filter(ut => 
                    ut.id !== 'motor-rifle-brigade'
                );
                removedUnitType = initialTypeLength > data.unitTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} 35th Guards Motor Rifle Brigade record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedUnitType) {
                console.log('✅ Also removed motor-rifle-brigade unit type (no other motor rifle brigades found)');
            }
        } else {
            console.log(`ℹ️ No 35th Guards Motor Rifle Brigade records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing 35th Guards Motor Rifle Brigade:', error.message);
        }
        return false;
    }
}

// Function to verify file structure after operation
function verifyFileStructure() {
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`\n📊 File structure after operation (${OPERATION_CONFIG.displayName}):`);
        console.log(`   Areas: ${data.areas ? data.areas.length : 0}`);
        console.log(`   Military Units: ${data.militaryUnits ? data.militaryUnits.length : 0}`);
        console.log(`   Unit Types: ${data.unitTypes ? data.unitTypes.length : 0}`);
        
        // Check for any remaining 35th Guards Motor Rifle Brigade references
        let remainingRefs = 0;
        if (data.militaryUnits) {
            data.militaryUnits.forEach(unit => {
                if (unit.names && unit.names.some(name => 
                    name.value.toLowerCase().includes('35th guards motor rifle brigade') || 
                    name.value.toLowerCase().includes('35-я гвардейская мотострелковая бригада')
                )) {
                    remainingRefs++;
                    console.log(`   Found 35th Guards Motor Rifle Brigade reference: ${unit.id}`);
                }
            });
        }
        
        console.log(`   35th Guards Motor Rifle Brigade references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining 35th Guards Motor Rifle Brigade references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding 35th Guards Motor Rifle Brigade to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add brigade to JSON file
        add35GdsMRBde();
        
        // Step 2: Check if web interface is running
        console.log('\n🌐 Checking web interface connection...');
        const isWebRunning = await checkWebInterface();
        
        if (!isWebRunning) {
            console.log('⚠️ Web interface is not running or not accessible');
            console.log(`   Expected at: ${WEB_INTERFACE_CONFIG.baseUrl}`);
            console.log('   Please start the web interface to enable automatic reload');
            console.log('   Command: python military_database_analyzer_v3.py --web');
            return;
        }
        
        console.log('✅ Web interface is accessible');
        
        // Step 3: Reload the database
        console.log('\n🔥 Reloading database...');
        const reloadSuccess = await reloadDatabase();
        
        if (!reloadSuccess) {
            console.log('⚠️ Database reload failed, but data was added to file');
            return;
        }
        
        // Step 4: Refresh current queries/analysis
        console.log('\n🔄 Refreshing analysis...');
        const refreshSuccess = await refreshCurrentQuery();
        
        // Step 5: Trigger additional refresh after a short delay
        console.log('🔄 Ensuring auto-refresh system detects changes...');
        setTimeout(async () => {
            try {
                await axios.post(`${WEB_INTERFACE_CONFIG.baseUrl}/api/analyze`, {
                    database_name: OPERATION_CONFIG.database,
                    layout: 'spring',
                    show_labels: true,
                    filters: {},
                    force_reload: true
                }, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Additional refresh completed for auto-refresh detection');
            } catch (error) {
                console.warn('⚠️ Additional refresh failed, but main operation was successful');
            }
        }, 2000);
        
        if (refreshSuccess) {
            console.log('\n🎉 Add operation completed successfully!');
            console.log(`   ✅ 35th Guards Motor Rifle Brigade added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 35th Guards Motor Rifle Brigade added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ❌ Analysis refresh failed');
            console.log('💡 Open the Analysis page and the auto-refresh will pick up the changes');
        }
        
        verifyFileStructure();
        
    } catch (error) {
        console.error('\n❌ Error during add operation:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Main remove operation
async function performRemoveOperation() {
    console.log(`🚀 Removing 35th Guards Motor Rifle Brigade from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove brigade from JSON file
        console.log('🔍 Removing brigade from JSON file...');
        success = remove35GdsMRBde();
        
        if (!success) {
            console.log('\n❌ No records were removed from the file');
            return;
        }
        
        // Step 2: Verify file structure
        verifyFileStructure();
        
        // Step 3: Check if web interface is running
        console.log('\n🌐 Checking web interface connection...');
        const isWebRunning = await checkWebInterface();
        
        if (!isWebRunning) {
            console.log('⚠️ Web interface is not running or not accessible');
            console.log(`   Expected at: ${WEB_INTERFACE_CONFIG.baseUrl}`);
            console.log('   Data was removed from file, but web interface not updated');
            console.log('   Please start the web interface and reload manually');
            console.log('   Command: python military_database_analyzer_v3.py --web');
            return;
        }
        
        console.log('✅ Web interface is accessible');
        
        // Step 4: Clear any cached data
        await clearCachedData();
        
        // Step 5: Reload the database
        console.log('\n🔥 Reloading database...');
        const reloadSuccess = await reloadDatabase();
        
        if (!reloadSuccess) {
            console.log('⚠️ Database reload failed, but data was removed from file');
            return;
        }
        
        // Step 6: Refresh current queries/analysis
        console.log('\n🔄 Refreshing analysis...');
        const refreshSuccess = await refreshCurrentQuery();
        
        // Step 7: Trigger additional refresh after a short delay
        console.log('🔄 Ensuring auto-refresh system detects changes...');
        setTimeout(async () => {
            try {
                await axios.post(`${WEB_INTERFACE_CONFIG.baseUrl}/api/analyze`, {
                    database_name: OPERATION_CONFIG.database,
                    layout: 'spring',
                    show_labels: true,
                    filters: {},
                    force_reload: true
                }, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Additional refresh completed for auto-refresh detection');
            } catch (error) {
                console.warn('⚠️ Additional refresh failed, but main operation was successful');
            }
        }, 2000);
        
        if (refreshSuccess) {
            console.log('\n🎉 Remove operation completed successfully!');
            console.log(`   ✅ 35th Guards Motor Rifle Brigade removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The 35th Guards Motor Rifle Brigade should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 35th Guards Motor Rifle Brigade removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ❌ Analysis refresh failed');
            console.log('💡 Open the Analysis page to see the updated results');
        }
        
    } catch (error) {
        console.error('\n❌ Error during remove operation:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

// Function to list available databases
async function listAvailableDatabases() {
    console.log('📋 Available Databases:');
    console.log('=====================\n');
    
    // Try to get databases from web interface first
    const webDatabases = await getAvailableDatabases();
    const isWebRunning = await checkWebInterface();
    
    if (isWebRunning && webDatabases.length > 0) {
        console.log('🌐 From Web Interface:');
        webDatabases.forEach(db => {
            const config = DATABASE_CONFIGS[db];
            if (config) {
                console.log(`   ${db}: ${config.displayName} - ${config.description}`);
            } else {
                console.log(`   ${db}: Unknown database`);
            }
        });
    } else {
        console.log('📁 From Local Configuration:');
        Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
            const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', config.dataFile);
            const exists = fs.existsSync(filePath) ? '✅' : '❌';
            console.log(`   ${key}: ${config.displayName} - ${config.description} ${exists}`);
        });
        
        if (!isWebRunning) {
            console.log('\n⚠️ Web interface not running - showing local configuration only');
            console.log('   Start web interface for live database status');
        }
    }

    console.log('\n💡 Usage:');
    console.log('   node 35GdsMRBde.js add <database>     - Add 35th Guards Motor Rifle Brigade');
    console.log('   node 35GdsMRBde.js remove <database>  - Remove 35th Guards Motor Rifle Brigade');
    console.log('   node 35GdsMRBde.js list               - Show available databases');
    console.log('\n📖 Examples:');
    console.log('   node 35GdsMRBde.js add OP7');
    console.log('   node 35GdsMRBde.js remove OP1');
}

// Main execution logic
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🎖️ 35th Guards Motor Rifle Brigade Database Manager');
        console.log('==================================================\n');
        await listAvailableDatabases();
        return;
    }
    
    // Parse new-style --add and --db flags
    let operation = null;
    let database = null;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--add') {
            operation = 'add';
        } else if (args[i] === '--del') {
            operation = 'remove';
        } else if (args[i] === '--db' && i + 1 < args.length) {
            database = args[i + 1].toUpperCase();
            i++; // Skip the next argument since we consumed it
        } else if (args[i] === 'list') {
            operation = 'list';
        } else if (!operation && ['add', 'remove'].includes(args[i].toLowerCase())) {
            // Support old-style commands
            operation = args[i].toLowerCase();
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                database = args[i + 1].toUpperCase();
            }
        }
    }
    
    // Default to OP7 if no database specified
    if (!database && operation !== 'list') {
        database = 'OP7';
        console.log('💡 No database specified, defaulting to OP7 (Odesa Oblast)');
    }
    
    switch (operation) {
        case 'add':
            if (!DATABASE_CONFIGS[database]) {
                console.error(`❌ Unknown database: ${database}`);
                console.log('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
                return;
            }
            initializeOperationConfig(database);
            await performAddOperation();
            break;
            
        case 'remove':
            if (!DATABASE_CONFIGS[database]) {
                console.error(`❌ Unknown database: ${database}`);
                console.log('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
                return;
            }
            initializeOperationConfig(database);
            await performRemoveOperation();
            break;
            
        case 'list':
            await listAvailableDatabases();
            break;
            
        default:
            console.error(`❌ Unknown operation: ${args[0]}`);
            console.log('Available operations: --add, --remove, list');
            console.log('\nUsage examples:');
            console.log('  node 35GdsMRBde.js --add --db OP7');
            console.log('  node 35GdsMRBde.js --add (defaults to OP7)');
            console.log('  node 35GdsMRBde.js --del --db OP5');
            console.log('  node 35GdsMRBde.js add OP7 (old style)');
            console.log('  node 35GdsMRBde.js list');
            await listAvailableDatabases();
    }
}

// Export functions for external use
module.exports = {
    initializeOperationConfig,
    add35GdsMRBde,
    remove35GdsMRBde,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    verifyFileStructure
};

// Run main function if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    });
}