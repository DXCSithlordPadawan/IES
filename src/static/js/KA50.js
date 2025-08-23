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

// Database configuration mapping
const DATABASE_CONFIGS = {
    'OP7': {
        dataFile: 'odesa_oblast.json',
        displayName: 'Odesa Oblast',
        description: 'Ukrainian Odesa Oblast military database'
    },
    'OP1': {
        dataFile: 'kyiv_oblast.json',
        displayName: 'Kyiv Oblast',
        description: 'Ukrainian Kyiv Oblast military database'
    },
    'OP2': {
        dataFile: 'kharkiv_oblast.json',
        displayName: 'Kharkiv Oblast',
        description: 'Ukrainian Kharkiv Oblast military database'
    },
    'OP3': {
        dataFile: 'dnipro_oblast.json',
        displayName: 'Dnipro Oblast',
        description: 'Ukrainian Dnipro Oblast military database'
    },
    'OP4': {
        dataFile: 'zaporizhzhia_oblast.json',
        displayName: 'Zaporizhzhia Oblast',
        description: 'Ukrainian Zaporizhzhia Oblast military database'
    },
    'OP5': {
        dataFile: 'donetsk_oblast.json',
        displayName: 'Donetsk Oblast',
        description: 'Ukrainian Donetsk Oblast military database'
    },
    'OP6': {
        dataFile: 'luhansk_oblast.json',
        displayName: 'Luhansk Oblast',
        description: 'Ukrainian Luhansk Oblast military database'
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

// Function to clear any cached data that might contain Ka-50
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

// Function to backup the file before modification
function backupFile() {
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.join('C:', 'ies4-military-database-analysis', 'data', 
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

// Function to add Ka-50 helicopter to the JSON data
function addKa50Helicopter() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const helicopterId = `vehicle-ka50-helicopter-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Ka-50 helicopter entry following IES4 schema
    const ka50Helicopter = {
        "id": helicopterId,
        "uri": "https://en.wikipedia.org/wiki/Kamov_Ka-50",
        "type": "Vehicle",
        "names": [
            {
                "value": "Ka-50",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Ка-50",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Black Shark",
                "language": "en",
                "nameType": "nickname"
            },
            {
                "value": "Чёрная акула",
                "language": "ru",
                "nameType": "nickname"
            },
            {
                "value": "Hokum A",
                "language": "en",
                "nameType": "nato_reporting_name"
            }
        ],
        "identifiers": [
            {
                "value": "Ka-50",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Soviet Union"
            },
            {
                "value": "V-80Sh-1",
                "identifierType": "PROTOTYPE_DESIGNATION",
                "issuingAuthority": "Kamov Design Bureau"
            },
            {
                "value": "Hokum A",
                "identifierType": "NATO_REPORTING_NAME",
                "issuingAuthority": "NATO"
            }
        ],
        "vehicleType": "attack-helicopter",
        "make": "Kamov Design Bureau",
        "model": "Ka-50",
        "year": 1995,
        "owner": "Soviet Union/Russian Federation",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "ka50-wiki",
                "type": "webpage",
                "title": "Kamov Ka-50 - Wikipedia",
                "description": "Wikipedia article about the Ka-50 attack helicopter",
                "url": "https://en.wikipedia.org/wiki/Kamov_Ka-50"
            }
        ],
        "temporalParts": [
            {
                "id": "ka50-development-start",
                "stateType": "development_started",
                "startTime": "1980-01-01T00:00:00Z",
                "location": "Kamov Design Bureau, USSR"
            },
            {
                "id": "ka50-prototype-complete",
                "stateType": "prototype_completed",
                "startTime": "1985-01-01T00:00:00Z",
                "location": "Kamov Design Bureau, USSR"
            },
            {
                "id": "ka50-production-start",
                "stateType": "production_started",
                "startTime": "1987-01-01T00:00:00Z",
                "location": "Progress Company, Arsenyev"
            },
            {
                "id": "ka50-service-entry",
                "stateType": "entered_service",
                "startTime": "1995-08-28T00:00:00Z",
                "location": "Russian Armed Forces"
            },
            {
                "id": `ka50-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2000-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `ka50-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2000-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional helicopter-specific properties
        "specifications": {
            "emptyWeight": "7,700 kg",
            "maxTakeoffWeight": "10,800 kg",
            "length": "16 m",
            "height": "4.93 m",
            "crew": 1,
            "classification": "Attack helicopter",
            "mainRotorDiameter": "14.5 m (coaxial)",
            "powerplant": "2 × Klimov VK-2500 turboshaft engines",
            "powerOutput": "3,600 shp (2,400 shp each)",
            "maxSpeed": "315 km/h",
            "cruiseSpeed": "270 km/h",
            "range": "545 km",
            "serviceCeiling": "5,500 m",
            "mainArmament": "30 mm Shipunov 2A42 autocannon",
            "hardpoints": "6 × under-wing hardpoints",
            "deploymentRegion": OPERATION_CONFIG.displayName,
            "uniqueFeatures": [
                "Coaxial contra-rotating rotors",
                "K-37-800 ejection seat",
                "Semi-rigid cannon mounting",
                "Single-seat configuration"
            ]
        },
        "variants": [
            "Ka-50",
            "Ka-50N Night Shark",
            "Ka-50Sh",
            "Ka-50-2 Erdogan",
            "Ka-52 Alligator",
            "Ka-52K Katran",
            "Ka-52M Super Alligator"
        ]
    };
    
    // Create vehicle type definition for attack helicopters
    const attackHelicopterType = {
        "id": "attack-helicopter",
        "name": "Attack Helicopter",
        "category": "rotorcraft",
        "subcategory": "helicopter",
        "description": "Single-seat attack helicopter designed for anti-tank and close air support missions",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "attack helicopter",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "1",
                "dataType": "number"
            },
            {
                "name": "empty_weight_kg",
                "value": "7700",
                "dataType": "number"
            },
            {
                "name": "main_gun_caliber",
                "value": "30",
                "dataType": "number"
            },
            {
                "name": "rotor_system",
                "value": "coaxial",
                "dataType": "string"
            }
        ]
    };
    
    // Add vehicles array if it doesn't exist
    if (!data.vehicles) {
        data.vehicles = [];
    }
    
    // Add vehicleTypes array if it doesn't exist
    if (!data.vehicleTypes) {
        data.vehicleTypes = [];
    }
    
    // Check if Ka-50 already exists (check for any Ka-50 in this database)
    const existingHelicopter = data.vehicles.find(v => 
        v.id.includes('vehicle-ka50-helicopter') || 
        (v.names && v.names.some(name => 
            name.value === 'Ka-50' || 
            name.value === 'Ка-50' ||
            name.value === 'Black Shark' ||
            name.value === 'Чёрная акула'
        ))
    );
    
    if (existingHelicopter) {
        console.log(`ℹ️ Ka-50 helicopter already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingHelicopter.id);
        data.vehicles[index] = { ...ka50Helicopter, id: existingHelicopter.id };
    } else {
        // Add the helicopter to the vehicles array
        data.vehicles.push(ka50Helicopter);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "attack-helicopter");
    if (!existingVehicleType) {
        data.vehicleTypes.push(attackHelicopterType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Ka-50 helicopter to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vehicle ID:', ka50Helicopter.id);
    console.log('🏷️ Vehicle type added:', attackHelicopterType.id);
    
    return data;
}

// Function to remove Ka-50 helicopter from the JSON data
function removeKa50Helicopter() {
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return false;
        }
        
        // Read the existing JSON file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let removedCount = 0;
        let removedVehicleType = false;
        
        // Remove Ka-50 from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the Ka-50
                const isKa50Helicopter = 
                    vehicle.id.includes('vehicle-ka50-helicopter') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'Ka-50' || 
                        name.value === 'Ка-50' ||
                        name.value === 'Black Shark' ||
                        name.value === 'Чёрная акула'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'Ka-50' || 
                        id.value === 'V-80Sh-1' ||
                        id.value === 'Hokum A'
                    ));
                
                return !isKa50Helicopter;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the attack helicopter type
        // (only if no other attack helicopters remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherAttackHelicopters = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'attack-helicopter'
            );
            
            if (!hasOtherAttackHelicopters) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'attack-helicopter'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Ka-50 helicopter record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed attack-helicopter vehicle type (no other attack helicopters found)');
            }
        } else {
            console.log(`ℹ️ No Ka-50 helicopter records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Ka-50 helicopter:', error.message);
        }
        return false;
    }
}

// Function to verify file structure after operation
function verifyFileStructure() {
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`\n📊 File structure after operation (${OPERATION_CONFIG.displayName}):`);
        console.log(`   Areas: ${data.areas ? data.areas.length : 0}`);
        console.log(`   Vehicles: ${data.vehicles ? data.vehicles.length : 0}`);
        console.log(`   Vehicle Types: ${data.vehicleTypes ? data.vehicleTypes.length : 0}`);
        
        // Check for any remaining Ka-50 references
        let remainingRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('ka-50') || 
                    name.value.toLowerCase().includes('ка-50') ||
                    name.value.toLowerCase().includes('black shark') ||
                    name.value.toLowerCase().includes('чёрная акула')
                )) {
                    remainingRefs++;
                    console.log(`   Found Ka-50 reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   Ka-50 references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining Ka-50 helicopter references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding Ka-50 helicopter to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add helicopter to JSON file
        addKa50Helicopter();
        
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
            console.log(`   ✅ Ka-50 helicopter added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Ka-50 helicopter added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing Ka-50 helicopter from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove helicopter from JSON file
        console.log('🗑️ Removing helicopter from JSON file...');
        success = removeKa50Helicopter();
        
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
            console.log(`   ✅ Ka-50 helicopter removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Ka-50 helicopter should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Ka-50 helicopter removed from ${OPERATION_CONFIG.displayName}`);
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
}

// Main execution based on command line arguments
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Ka-50 Helicopter Database Operations');
        console.log('===================================\n');
        console.log('Usage:');
        console.log('  node ka50.js <operation> <database>');
        console.log('');
        console.log('Operations:');
        console.log('  add     - Add Ka-50 helicopter to the specified database');
        console.log('  remove  - Remove Ka-50 helicopter from the specified database');
        console.log('  list    - List all available databases');
        console.log('');
        console.log('Databases:');
        console.log('  OP1 - Kyiv Oblast');
        console.log('  OP2 - Kharkiv Oblast');
        console.log('  OP3 - Dnipro Oblast');
        console.log('  OP4 - Zaporizhzhia Oblast');
        console.log('  OP5 - Donetsk Oblast');
        console.log('  OP6 - Luhansk Oblast');
        console.log('  OP7 - Odesa Oblast');
        console.log('');
        console.log('Examples:');
        console.log('  node ka50.js add OP7');
        console.log('  node ka50.js remove OP3');
        console.log('  node ka50.js list');
        return;
    }
    
    const operation = args[0].toLowerCase();
    
    if (operation === 'list') {
        await listAvailableDatabases();
        return;
    }
    
    if (args.length < 2) {
        console.error('❌ Error: Database parameter required for add/remove operations');
        console.log('Use: node ka50.js <operation> <database>');
        console.log('Example: node ka50.js add OP7');
        return;
    }
    
    const database = args[1].toUpperCase();
    
    // Validate database
    if (!DATABASE_CONFIGS[database]) {
        console.error(`❌ Error: Unknown database '${database}'`);
        console.log('Available databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7');
        return;
    }
    
    // Initialize operation configuration
    initializeOperationConfig(database);
    
    // Execute the requested operation
    switch (operation) {
        case 'add':
            await performAddOperation();
            break;
        case 'remove':
            await performRemoveOperation();
            break;
        default:
            console.error(`❌ Error: Unknown operation '${operation}'`);
            console.log('Available operations: add, remove, list');
            break;
    }
}

// Export functions for potential module usage
module.exports = {
    initializeOperationConfig,
    getAvailableDatabases,
    checkWebInterface,
    reloadDatabase,
    refreshCurrentQuery,
    addKa50Helicopter,
    removeKa50Helicopter,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    DATABASE_CONFIGS,
    WEB_INTERFACE_CONFIG
};

// Run main function if script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Fatal error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    });
}