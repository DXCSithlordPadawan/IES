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

// Function to clear any cached data that might contain Tor missile system
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

// Function to add Tor missile system to the JSON data
function addTorMissileSystem() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const torId = `vehicle-tor-sam-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Tor missile system entry following IES4 schema
    const torMissileSystem = {
        "id": torId,
        "uri": "https://en.wikipedia.org/wiki/Tor_missile_system",
        "type": "Vehicle",
        "names": [
            {
                "value": "Tor",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Тор",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "SA-15 Gauntlet",
                "language": "en",
                "nameType": "nato_designation"
            }
        ],
        "identifiers": [
            {
                "value": "SA-15",
                "identifierType": "NATO_DESIGNATION",
                "issuingAuthority": "NATO"
            },
            {
                "value": "9K330",
                "identifierType": "GRAU_DESIGNATION",
                "issuingAuthority": "Soviet Union"
            },
            {
                "value": "Gauntlet",
                "identifierType": "NATO_CODENAME",
                "issuingAuthority": "NATO"
            }
        ],
        "vehicleType": "surface-to-air-missile-system",
        "make": "Izhevsk Electromechanical Plant Kupol",
        "model": "Tor",
        "year": 1986,
        "owner": "Soviet Union/Russian Federation",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "tor-wiki",
                "type": "webpage",
                "title": "Tor missile system - Wikipedia",
                "description": "Wikipedia article about the Tor surface-to-air missile system",
                "url": "https://en.wikipedia.org/wiki/Tor_missile_system"
            }
        ],
        "temporalParts": [
            {
                "id": "tor-development-start",
                "stateType": "development_started",
                "startTime": "1975-01-01T00:00:00Z",
                "location": "Izhevsk Electromechanical Plant, USSR"
            },
            {
                "id": "tor-first-test",
                "stateType": "first_test",
                "startTime": "1983-01-01T00:00:00Z",
                "location": "USSR Test Range"
            },
            {
                "id": "tor-service-entry",
                "stateType": "entered_service",
                "startTime": "1986-01-01T00:00:00Z",
                "location": "Soviet Armed Forces"
            },
            {
                "id": `tor-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `tor-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional missile system-specific properties
        "specifications": {
            "weight": "32 tonnes",
            "length": "7.4 m",
            "width": "3.26 m",
            "height": "4.02 m",
            "crew": 4,
            "classification": "Self-propelled surface-to-air missile system",
            "missileType": "9M330/9M331",
            "guidance": "Command guidance with semi-active radar homing",
            "maxRange": "12-15 km",
            "maxAltitude": "6-10 km",
            "rocketCount": "8 missiles (ready to fire)",
            "reloadTime": "5 minutes",
            "radarRange": "25 km (detection)",
            "mobilityType": "Tracked",
            "operationalRange": "500 km",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "Tor-M1",
            "Tor-M1-2U",
            "Tor-M2",
            "Tor-M2E",
            "Tor-M2K",
            "Tor-M2KM"
        ],
        "capabilities": [
            "All-weather operation",
            "Multiple target engagement",
            "Low-altitude air defense",
            "Autonomous operation",
            "NBC protection",
            "Day/night operation"
        ]
    };
    
    // Create vehicle type definition for surface-to-air missile systems
    const samSystemType = {
        "id": "surface-to-air-missile-system",
        "name": "Surface-to-Air Missile System",
        "category": "air defense system",
        "subcategory": "SAM",
        "description": "Self-propelled surface-to-air missile system for air defense",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "air_defense",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "4",
                "dataType": "number"
            },
            {
                "name": "weight_tonnes",
                "value": "32",
                "dataType": "number"
            },
            {
                "name": "max_range_km",
                "value": "15",
                "dataType": "number"
            },
            {
                "name": "missile_count",
                "value": "8",
                "dataType": "number"
            },
            {
                "name": "mobility_type",
                "value": "tracked",
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
    
    // Check if Tor already exists (check for any Tor in this database)
    const existingTor = data.vehicles.find(v => 
        v.id.includes('vehicle-tor-sam') || 
        (v.names && v.names.some(name => 
            name.value === 'Tor' || 
            name.value === 'Тор' ||
            name.value === 'SA-15 Gauntlet'
        ))
    );
    
    if (existingTor) {
        console.log(`ℹ️ Tor missile system already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingTor.id);
        data.vehicles[index] = { ...torMissileSystem, id: existingTor.id };
    } else {
        // Add the missile system to the vehicles array
        data.vehicles.push(torMissileSystem);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "surface-to-air-missile-system");
    if (!existingVehicleType) {
        data.vehicleTypes.push(samSystemType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Tor missile system to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vehicle ID:', torMissileSystem.id);
    console.log('🏷️ Vehicle type added:', samSystemType.id);
    
    return data;
}

// Function to remove Tor missile system from the JSON data
function removeTorMissileSystem() {
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
        
        // Remove Tor from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the Tor
                const isTorSystem = 
                    vehicle.id.includes('vehicle-tor-sam') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'Tor' || 
                        name.value === 'Тор' ||
                        name.value === 'SA-15 Gauntlet'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'SA-15' || 
                        id.value === '9K330' ||
                        id.value === 'Gauntlet'
                    ));
                
                return !isTorSystem;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the surface-to-air missile system type
        // (only if no other SAM systems remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherSAMSystems = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'surface-to-air-missile-system'
            );
            
            if (!hasOtherSAMSystems) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'surface-to-air-missile-system'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Tor missile system record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed surface-to-air-missile-system vehicle type (no other SAM systems found)');
            }
        } else {
            console.log(`ℹ️ No Tor missile system records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Tor missile system:', error.message);
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
        
        // Check for any remaining Tor references
        let remainingRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('tor') || 
                    name.value.toLowerCase().includes('тор') ||
                    name.value.toLowerCase().includes('sa-15')
                )) {
                    remainingRefs++;
                    console.log(`   Found Tor reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   Tor references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining Tor missile system references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding Tor missile system to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add missile system to JSON file
        addTorMissileSystem();
        
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
            console.log(`   ✅ Tor missile system added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Tor missile system added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing Tor missile system from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove missile system from JSON file
        console.log('🔍 Removing missile system from JSON file...');
        success = removeTorMissileSystem();
        
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
            console.log(`   ✅ Tor missile system removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Tor missile system should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Tor missile system removed from ${OPERATION_CONFIG.displayName}`);
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

// Export functions for use as a module
module.exports = {
    initializeOperationConfig,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    DATABASE_CONFIGS,
    WEB_INTERFACE_CONFIG
};

// If this script is run directly (not imported as a module)
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🎯 Tor Missile System Database Management Tool');
        console.log('==============================================\n');
        console.log('Usage: node Tor.js <operation> [database]');
        console.log('\nOperations:');
        console.log('  add      - Add Tor missile system to database');
        console.log('  remove   - Remove Tor missile system from database');
        console.log('  list     - List available databases');
        console.log('\nDatabases:');
        Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
            console.log(`  ${key}      - ${config.displayName}`);
        });
        console.log('\nExamples:');
        console.log('  node Tor.js add OP7          # Add to Odesa Oblast');
        console.log('  node Tor.js remove OP1       # Remove from Kyiv Oblast');
        console.log('  node Tor.js list             # List all databases');
        process.exit(0);
    }
    
    const operation = args[0].toLowerCase();
    const database = args[1] || 'OP7'; // Default to OP7
    
    // Initialize configuration
    initializeOperationConfig(database);
    
    // Execute the requested operation
    switch (operation) {
        case 'add':
            performAddOperation();
            break;
        case 'remove':
            performRemoveOperation();
            break;
        case 'list':
            listAvailableDatabases();
            break;
        default:
            console.error(`❌ Unknown operation: ${operation}`);
            console.log('Valid operations: add, remove, list');
            process.exit(1);
    }
}