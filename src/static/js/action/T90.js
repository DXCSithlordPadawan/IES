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

// Function to clear any cached data that might contain T-90
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

// Function to add T-90 tank to the JSON data
function addT90Tank() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const tankId = `vehicle-t90-tank-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the T-90 tank entry following IES4 schema
    const t90Tank = {
        "id": tankId,
        "uri": "https://en.wikipedia.org/wiki/T-90",
        "type": "Vehicle",
        "names": [
            {
                "value": "T-90",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Т-90",
                "language": "ru",
                "nameType": "official"
            }
        ],
        "identifiers": [
            {
                "value": "Object 188",
                "identifierType": "PROJECT_CODE",
                "issuingAuthority": "Russian Armed Forces"
            },
            {
                "value": "Third-generation MBT",
                "identifierType": "CLASS_DESIGNATION",
                "issuingAuthority": "NATO"
            }
        ],
        "vehicleType": "main-battle-tank",
        "make": "Uralvagonzavod",
        "model": "T-90",
        "year": 1992,
        "owner": "Russian Armed Forces",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "t90-wiki",
                "type": "webpage",
                "title": "T-90 - Wikipedia",
                "description": "Wikipedia article about the T-90 main battle tank",
                "url": "https://en.wikipedia.org/wiki/T-90"
            }
        ],
        "temporalParts": [
            {
                "id": "t90-development",
                "stateType": "development",
                "startTime": "1986-01-01T00:00:00Z",
                "location": "Nizhny Tagil, Russia"
            },
            {
                "id": "t90-first-prototype",
                "stateType": "prototype_completed",
                "startTime": "1988-01-01T00:00:00Z",
                "location": "Uralvagonzavod"
            },
            {
                "id": "t90-entered-service",
                "stateType": "entered_service",
                "startTime": "1992-01-01T00:00:00Z",
                "location": "Russian Armed Forces"
            },
            {
                "id": "t90-export-approved",
                "stateType": "export_approved",
                "startTime": "1995-01-01T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": `t90-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `t90-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_production",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional tank-specific properties
        "specifications": {
            "weight": {
                "combat": "46.5 tonnes",
                "empty": "44 tonnes"
            },
            "classification": "Third-generation main battle tank",
            "crew": 3,
            "armament": {
                "main_gun": "125 mm 2A46M smoothbore gun",
                "secondary": "12.7 mm NSV/Kord heavy machine gun, 7.62 mm PKMT coaxial machine gun"
            },
            "engine": {
                "type": "V-92S2 diesel engine",
                "power": "1000 hp (750 kW)"
            },
            "protection": {
                "armor": "Composite armor with Kontakt-5 ERA",
                "countermeasures": "Shtora-1 infrared jamming system"
            },
            "performance": {
                "max_speed_road": "60 km/h",
                "max_speed_offroad": "45 km/h",
                "operational_range": "550 km"
            },
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "T-90A",
            "T-90S",
            "T-90AM",
            "T-90M",
            "T-90MS"
        ]
    };
    
    // Create vehicle type definition for main battle tanks
    const mainBattleTankType = {
        "id": "main-battle-tank",
        "name": "Main Battle Tank",
        "category": "armored vehicle",
        "subcategory": "main battle tank",
        "description": "Third-generation main battle tank designed for frontline combat",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "frontline combat",
                "dataType": "string"
            },
            {
                "name": "generation",
                "value": "third-generation",
                "dataType": "string"
            },
            {
                "name": "weight_combat",
                "value": "46.5",
                "dataType": "number"
            },
            {
                "name": "main_gun_caliber",
                "value": "125",
                "dataType": "number"
            },
            {
                "name": "crew_size",
                "value": "3",
                "dataType": "number"
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
    
    // Check if T-90 tank already exists (check for any T-90 in this database)
    const existingTank = data.vehicles.find(v => 
        v.id.includes('vehicle-t90-tank') || 
        (v.names && v.names.some(name => 
            name.value === 'T-90' || 
            name.value === 'Т-90'
        ))
    );
    
    if (existingTank) {
        console.log(`ℹ️ T-90 tank already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingTank.id);
        data.vehicles[index] = { ...t90Tank, id: existingTank.id };
    } else {
        // Add the tank to the vehicles array
        data.vehicles.push(t90Tank);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "main-battle-tank");
    if (!existingVehicleType) {
        data.vehicleTypes.push(mainBattleTankType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added T-90 tank to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added tank ID:', t90Tank.id);
    console.log('🏷️ Vehicle type added:', mainBattleTankType.id);
    
    return data;
}

// Function to remove T-90 tank from the JSON data
function removeT90Tank() {
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
        
        // Remove T-90 from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the T-90 tank
                const isT90Tank = 
                    vehicle.id.includes('vehicle-t90-tank') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'T-90' || 
                        name.value === 'Т-90'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'Object 188' || 
                        id.value === 'Third-generation MBT'
                    )) ||
                    (vehicle.make === 'Uralvagonzavod' && vehicle.model === 'T-90');
                
                return !isT90Tank;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the main battle tank type
        // (only if no other main battle tanks remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherMBTs = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'main-battle-tank'
            );
            
            if (!hasOtherMBTs) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'main-battle-tank'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} T-90 tank record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed main-battle-tank vehicle type (no other MBTs found)');
            }
        } else {
            console.log(`ℹ️ No T-90 tank records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing T-90 tank:', error.message);
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
        
        // Check for any T-90 references
        let t90Refs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('t-90') || 
                    name.value.toLowerCase().includes('т-90')
                )) {
                    t90Refs++;
                    console.log(`   Found T-90 reference: ${vehicle.id}`);
                }
                
                if (vehicle.make === 'Uralvagonzavod' && 
                    vehicle.model && vehicle.model.toLowerCase().includes('t-90')) {
                    t90Refs++;
                    console.log(`   Found T-90 reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   T-90 references found: ${t90Refs}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚗 Adding T-90 tank to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add tank to JSON file
        addT90Tank();
        
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
            console.log(`   ✅ T-90 tank added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ T-90 tank added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚗 Removing T-90 tank from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove tank from JSON file
        console.log('🔍 Removing tank from JSON file...');
        success = removeT90Tank();
        
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
            console.log(`   ✅ T-90 tank removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The T-90 tank should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ T-90 tank removed from ${OPERATION_CONFIG.displayName}`);
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
    
    console.log('\n💡 Default database: OP7 (Odesa Oblast)');
    console.log('💡 Usage: --db <database_code> to specify different database');
}

// Function to display help information
function displayHelp() {
    console.log('🚗 T-90 Tank Database Management Tool');
    console.log('======================================\n');
    console.log('Usage: node T90.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add T-90 tank to specified database');
    console.log('  --del              Remove T-90 tank from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node T90.js --add --db OP7       Add T-90 to Odesa Oblast database');
    console.log('  node T90.js --del --db OP1       Remove T-90 from Donetsk Oblast database');
    console.log('  node T90.js --list               Show all available databases');
    console.log('  node T90.js --diagnostic         Run system diagnostics\n');
    console.log('Tank Details:');
    console.log('  - Third-generation Russian main battle tank');
    console.log('  - Combat weight: 46.5 tonnes, Crew: 3');
    console.log('  - Main gun: 125mm 2A46M smoothbore gun');
    console.log('  - Engine: V-92S2 diesel, 1000 hp');
    console.log('  - Protection: Composite armor with Kontakt-5 ERA');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running T90.js Diagnostic Checks');
    console.log('====================================\n');
    
    // 1. Check current working directory
    console.log('1. 📁 Current Working Directory:');
    console.log(`   ${process.cwd()}\n`);
    
    // 2. Check database configurations
    console.log('2. ⚙️ Database Configuration Check:');
    Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
        const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', config.dataFile);
        const exists = fs.existsSync(filePath);
        const status = exists ? '✅' : '❌';
        console.log(`   ${key}: ${config.dataFile} ${status}`);
        
        if (exists) {
            try {
                const stats = fs.statSync(filePath);
                console.log(`       Size: ${(stats.size / 1024).toFixed(2)} KB`);
                
                // Try to parse JSON
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                console.log(`       Vehicle count: ${data.vehicles ? data.vehicles.length : 0}`);
                console.log(`       Areas count: ${data.areas ? data.areas.length : 0}`);
            } catch (error) {
                console.log(`       ❌ Error reading file: ${error.message}`);
            }
        }
    });
    
    // 3. Check web interface connectivity
    console.log('\n3. 🌐 Web Interface Check:');
    checkWebInterface().then(isRunning => {
        if (isRunning) {
            console.log(`   ✅ Web interface is accessible at ${WEB_INTERFACE_CONFIG.baseUrl}`);
        } else {
            console.log(`   ❌ Web interface is not accessible at ${WEB_INTERFACE_CONFIG.baseUrl}`);
        }
    });
    
    // 4. Check dependencies
    console.log('\n4. 📦 Dependencies Check:');
    try {
        require('axios');
        console.log('   ✅ axios dependency found');
    } catch (error) {
        console.log('   ❌ axios dependency missing - run: npm install axios');
    }
    
    console.log('\n📋 Diagnostic Summary:');
    console.log('====================');
    console.log(`Configured databases: ${Object.keys(DATABASE_CONFIGS).length}`);
    console.log(`Web interface URL: ${WEB_INTERFACE_CONFIG.baseUrl}`);
    
    return true;
}

// Check axios dependency
function checkDependencies() {
    try {
        require('axios');
    } catch (error) {
        console.error('❌ Missing dependency: axios');
        console.error('Please install it with: npm install axios');
        process.exit(1);
    }
}

// Function to parse command line arguments in the new format
function parseArguments(args) {
    const parsed = {
        command: null,
        database: 'OP7', // default database
        help: false,
        diagnostic: false
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--add':
                parsed.command = 'add';
                break;
            case '--del':
                parsed.command = 'remove';
                break;
            case '--list':
                parsed.command = 'list';
                break;
            case '--diagnostic':
            case '--debug':
                parsed.diagnostic = true;
                break;
            case '--db':
                if (i + 1 < args.length) {
                    parsed.database = args[i + 1].toUpperCase();
                    i++; // Skip the next argument since we consumed it
                } else {
                    throw new Error('--db flag requires a database name');
                }
                break;
            case '--help':
            case '-h':
                parsed.help = true;
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }
    
    return parsed;
}

// Parse command line arguments and execute
async function main() {
    const args = process.argv.slice(2);
    
    // Handle no arguments or help request
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        displayHelp();
        process.exit(0);
    }
    
    try {
        // Parse arguments using the new format
        const parsedArgs = parseArguments(args);
        
        if (parsedArgs.help) {
            displayHelp();
            process.exit(0);
        }
        
        if (parsedArgs.diagnostic) {
            runDiagnostics();
            return;
        }
        
        // Validate command
        if (!parsedArgs.command) {
            console.error('❌ No command specified. Use --add, --del, --list, or --diagnostic');
            console.error('Use --help for usage information');
            process.exit(1);
        }
        
        // Handle list command without database validation
        if (parsedArgs.command === 'list') {
            await listAvailableDatabases();
            return;
        }
        
        // Check dependencies
        checkDependencies();
        
        // Validate database for add/remove commands
        if (!DATABASE_CONFIGS[parsedArgs.database]) {
            console.error(`❌ Invalid database: ${parsedArgs.database}`);
            console.error('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
            console.error('Use --list to see all available databases');
            process.exit(1);
        }
        
        // Initialize configuration
        try {
            initializeOperationConfig(parsedArgs.database);
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            console.log('\n💡 Try running: node T90.js --diagnostic');
            process.exit(1);
        }
        
        // Execute command
        switch (parsedArgs.command) {
            case 'add':
                await performAddOperation();
                break;
            case 'remove':
                await performRemoveOperation();
                break;
            default:
                console.error(`❌ Unknown command: ${parsedArgs.command}`);
                console.error('Available commands: --add, --del, --list, --diagnostic');
                process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error parsing arguments:', error.message);
        console.error('Use --help for usage information');
        process.exit(1);
    }
}

// Execute main function
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

// Export functions for potential module usage
module.exports = {
    initializeOperationConfig,
    addT90Tank,
    removeT90Tank,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    DATABASE_CONFIGS,
    WEB_INTERFACE_CONFIG
};