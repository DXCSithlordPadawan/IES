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

// Function to clear any cached data that might contain Shahed 136
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

// Function to add Shahed 136 drone to the JSON data
function addShahed136Drone() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const droneId = `uav-shahed136-drone-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Shahed 136 drone entry following IES4 schema
    const shahed136Drone = {
        "id": droneId,
        "uri": "https://en.wikipedia.org/wiki/HESA_Shahed_136",
        "type": "Vehicle",
        "names": [
            {
                "value": "HESA Shahed 136",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Shahed-136",
                "language": "fa",
                "nameType": "official"
            },
            {
                "value": "شاهد-۱۳۶",
                "language": "fa",
                "nameType": "official"
            },
            {
                "value": "Geran-2",
                "language": "ru",
                "nameType": "variant"
            }
        ],
        "identifiers": [
            {
                "value": "Shahed-136",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Iran"
            },
            {
                "value": "Geran-2",
                "identifierType": "VARIANT_NAME",
                "issuingAuthority": "Russia"
            },
            {
                "value": "HESA Shahed 136",
                "identifierType": "FULL_DESIGNATION",
                "issuingAuthority": "Iran Aircraft Manufacturing Industrial Company (HESA)"
            }
        ],
        "vehicleType": "loitering-munition",
        "make": "Iran Aircraft Manufacturing Industrial Company (HESA)",
        "model": "Shahed 136",
        "year": 2021,
        "owner": "Islamic Republic of Iran",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "shahed136-wiki",
                "type": "webpage",
                "title": "HESA Shahed 136 - Wikipedia",
                "description": "Wikipedia article about the HESA Shahed 136 loitering munition",
                "url": "https://en.wikipedia.org/wiki/HESA_Shahed_136"
            }
        ],
        "temporalParts": [
            {
                "id": "shahed136-development-start",
                "stateType": "development_started",
                "startTime": "2018-01-01T00:00:00Z",
                "location": "Iran Aircraft Manufacturing Industrial Company (HESA)"
            },
            {
                "id": "shahed136-first-flight",
                "stateType": "first_flight",
                "startTime": "2021-01-01T00:00:00Z",
                "location": "Iran"
            },
            {
                "id": "shahed136-production-start",
                "stateType": "production_started",
                "startTime": "2021-01-01T00:00:00Z",
                "location": "Iran Aircraft Manufacturing Industrial Company (HESA)"
            },
            {
                "id": "shahed136-service-entry",
                "stateType": "entered_service",
                "startTime": "2021-01-01T00:00:00Z",
                "location": "Iranian Armed Forces"
            },
            {
                "id": `shahed136-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2022-09-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `shahed136-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2022-09-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional drone-specific properties
        "specifications": {
            "weight": "200 kg",
            "length": "3.5 m",
            "wingspan": "2.5 m",
            "height": "0.6 m",
            "crew": 0,
            "classification": "Loitering munition / Kamikaze drone",
            "warhead": "50 kg high explosive",
            "engine": "Pusher propeller with piston engine",
            "powerOutput": "Unknown",
            "maxSpeed": "185 km/h",
            "cruisingSpeed": "120 km/h",
            "range": "2,500 km",
            "endurance": "Unknown",
            "guidanceSystem": "GNSS/INS",
            "launchMethod": "Rail launcher",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "Shahed-136",
            "Geran-2 (Russian designation)",
            "Shahed-131 (smaller variant)"
        ],
        "operationalHistory": [
            {
                "conflict": "2022 Russian invasion of Ukraine",
                "firstUse": "2022-09-13",
                "role": "Strategic bombing, infrastructure attacks",
                "notes": "Supplied to Russia by Iran"
            }
        ],
        "capabilities": [
            "Long-range strike",
            "One-way attack mission",
            "GPS guidance",
            "Low-altitude flight",
            "Infrastructure targeting"
        ]
    };
    
    // Create vehicle type definition for loitering munitions
    const loiteringMunitionType = {
        "id": "loitering-munition",
        "name": "Loitering Munition",
        "category": "unmanned aerial vehicle",
        "subcategory": "kamikaze drone",
        "description": "Unmanned aerial vehicle designed to loiter over an area and attack targets",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "loitering munition",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "0",
                "dataType": "number"
            },
            {
                "name": "weight_kg",
                "value": "200",
                "dataType": "number"
            },
            {
                "name": "warhead_kg",
                "value": "50",
                "dataType": "number"
            },
            {
                "name": "range_km",
                "value": "2500",
                "dataType": "number"
            },
            {
                "name": "guidance_type",
                "value": "GNSS_INS",
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
    
    // Check if Shahed 136 already exists
    const existingDrone = data.vehicles.find(v => 
        v.id.includes('uav-shahed136-drone') || 
        (v.names && v.names.some(name => 
            name.value === 'HESA Shahed 136' || 
            name.value === 'Shahed-136' || 
            name.value === 'شاهد-۱۳۶' ||
            name.value === 'Geran-2'
        ))
    );
    
    if (existingDrone) {
        console.log(`ℹ️ Shahed 136 drone already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingDrone.id);
        data.vehicles[index] = { ...shahed136Drone, id: existingDrone.id };
    } else {
        // Add the drone to the vehicles array
        data.vehicles.push(shahed136Drone);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "loitering-munition");
    if (!existingVehicleType) {
        data.vehicleTypes.push(loiteringMunitionType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Shahed 136 drone to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vehicle ID:', shahed136Drone.id);
    console.log('🏷️ Vehicle type added:', loiteringMunitionType.id);
    
    return data;
}

// Function to remove Shahed 136 drone from the JSON data
function removeShahed136Drone() {
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
        
        // Remove Shahed 136 from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the Shahed 136
                const isShahed136Drone = 
                    vehicle.id.includes('uav-shahed136-drone') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'HESA Shahed 136' || 
                        name.value === 'Shahed-136' || 
                        name.value === 'شاهد-۱۳۶' ||
                        name.value === 'Geran-2'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'Shahed-136' || 
                        id.value === 'Geran-2' ||
                        id.value === 'HESA Shahed 136'
                    ));
                
                return !isShahed136Drone;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the loitering munition type
        // (only if no other loitering munitions remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherLoiteringMunitions = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'loitering-munition'
            );
            
            if (!hasOtherLoiteringMunitions) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'loitering-munition'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Shahed 136 drone record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed loitering-munition vehicle type (no other loitering munitions found)');
            }
        } else {
            console.log(`ℹ️ No Shahed 136 drone records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Shahed 136 drone:', error.message);
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
        
        // Check for any remaining Shahed 136 references
        let remainingRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('shahed') || 
                    name.value.toLowerCase().includes('geran')
                )) {
                    remainingRefs++;
                    console.log(`   Found Shahed 136 reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   Shahed 136 references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining Shahed 136 drone references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding Shahed 136 drone to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add drone to JSON file
        addShahed136Drone();
        
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
            console.log(`   ✅ Shahed 136 drone added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Shahed 136 drone added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing Shahed 136 drone from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove drone from JSON file
        console.log('🔍 Removing drone from JSON file...');
        success = removeShahed136Drone();
        
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
            console.log(`   ✅ Shahed 136 drone removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Shahed 136 drone should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Shahed 136 drone removed from ${OPERATION_CONFIG.displayName}`);
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

    console.log('\n💡 Usage: node HS136.js [add|remove] [database_code]');
    console.log('   Examples:');
    console.log('     node HS136.js add OP7    # Add Shahed 136 to Odesa Oblast');
    console.log('     node HS136.js remove OP1 # Remove Shahed 136 from Kyiv Oblast');
    console.log('     node HS136.js list       # List all available databases');
}

// Main function to handle command line arguments
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
        console.log('🛩️ HESA Shahed 136 Drone Database Management Tool');
        console.log('=====================================================\n');
        console.log('This tool manages HESA Shahed 136 drone entries in the IES4 military database.');
        console.log('');
        await listAvailableDatabases();
        return;
    }
    
    const operation = args[0].toLowerCase();
    const database = args[1] ? args[1].toUpperCase() : 'OP7';
    
    if (operation === 'list') {
        await listAvailableDatabases();
        return;
    }
    
    if (!['add', 'remove'].includes(operation)) {
        console.error('❌ Invalid operation. Use "add" or "remove"');
        await listAvailableDatabases();
        return;
    }
    
    if (!DATABASE_CONFIGS[database]) {
        console.error(`❌ Invalid database: ${database}`);
        await listAvailableDatabases();
        return;
    }
    
    // Initialize configuration
    initializeOperationConfig(database);
    
    // Perform the requested operation
    if (operation === 'add') {
        await performAddOperation();
    } else if (operation === 'remove') {
        await performRemoveOperation();
    }
}

// Export functions for module use
module.exports = {
    initializeOperationConfig,
    addShahed136Drone,
    removeShahed136Drone,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    verifyFileStructure,
    checkWebInterface,
    reloadDatabase,
    refreshCurrentQuery
};

// Run main function if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    });
}