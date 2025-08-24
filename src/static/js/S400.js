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

// Function to clear any cached data that might contain S-400
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

// Function to add S-400 missile system to the JSON data
function addS400MissileSystem() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const systemId = `weapon-system-s400-triumf-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the S-400 missile system entry following IES4 schema
    const s400MissileSystem = {
        "id": systemId,
        "uri": "https://en.wikipedia.org/wiki/S-400_missile_system",
        "type": "Vehicle",
        "names": [
            {
                "value": "S-400 Triumf",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "С-400 Триумф",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "SA-21 Growler",
                "language": "en",
                "nameType": "nato_designation"
            }
        ],
        "identifiers": [
            {
                "value": "SA-21 Growler",
                "identifierType": "NATO_DESIGNATION",
                "issuingAuthority": "NATO"
            },
            {
                "value": "30K6E",
                "identifierType": "SYSTEM_CODE",
                "issuingAuthority": "Russian Defense Industry"
            },
            {
                "value": "98ZH6E",
                "identifierType": "BATTERY_CODE",
                "issuingAuthority": "Russian Defense Industry"
            }
        ],
        "vehicleType": "air-defense-missile-system",
        "make": "Almaz-Antey",
        "model": "S-400 Triumf",
        "year": 2007,
        "owner": "Russian Armed Forces",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "s400-wiki",
                "type": "webpage",
                "title": "S-400 missile system - Wikipedia",
                "description": "Wikipedia article about the S-400 Triumf surface-to-air missile system",
                "url": "https://en.wikipedia.org/wiki/S-400_missile_system"
            }
        ],
        "temporalParts": [
            {
                "id": "s400-development-started",
                "stateType": "development_initiated",
                "startTime": "1993-01-01T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": "s400-approved-for-service",
                "stateType": "service_approval",
                "startTime": "2007-04-28T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": "s400-first-combat-duty",
                "stateType": "operational_deployment",
                "startTime": "2007-08-06T00:00:00Z",
                "location": "Moscow Air Defense District"
            },
            {
                "id": `s400-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2024-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `s400-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "operational",
                "startTime": "2024-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional weapon system-specific properties
        "specifications": {
            "classification": "Long-range surface-to-air missile system",
            "range": {
                "detection_range": "600 km",
                "engagement_range": "400 km",
                "altitude_range": "10m to 30 km"
            },
            "missiles": [
                {
                    "type": "48N6E3",
                    "range": "250 km",
                    "description": "Long-range anti-aircraft missile"
                },
                {
                    "type": "40N6E",
                    "range": "400 km",
                    "description": "Ultra-long-range missile"
                },
                {
                    "type": "9M96E",
                    "range": "40 km",
                    "description": "Medium-range missile"
                },
                {
                    "type": "9M96E2",
                    "range": "120 km",
                    "description": "Extended medium-range missile"
                }
            ],
            "radar_systems": [
                {
                    "designation": "91N6E",
                    "type": "panoramic radar",
                    "range": "340 km"
                },
                {
                    "designation": "92N6E",
                    "type": "multi-functional radar",
                    "range": "340 km",
                    "tracking_capacity": "20 targets"
                }
            ],
            "targets": [
                "aircraft",
                "helicopters", 
                "cruise missiles",
                "ballistic missiles",
                "UAVs",
                "stealth aircraft"
            ],
            "mobility": {
                "road_speed": "60 km/h",
                "off_road_speed": "25 km/h",
                "setup_time": "5-10 minutes"
            },
            "simultaneous_targets": 80,
            "cost_per_battalion": "200 million USD"
        }
    };
    
    // Create vehicle type definition for air defense missile systems
    const airDefenseMissileSystemType = {
        "id": "air-defense-missile-system",
        "name": "Air Defense Missile System",
        "category": "military weapon system",
        "subcategory": "surface-to-air missile system",
        "description": "Long-range surface-to-air missile system designed to counter aerial threats",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "air defense",
                "dataType": "string"
            },
            {
                "name": "system_type",
                "value": "mobile SAM",
                "dataType": "string"
            },
            {
                "name": "max_range_km",
                "value": "400",
                "dataType": "number"
            },
            {
                "name": "max_altitude_km",
                "value": "30",
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
    
    // Check if S-400 already exists (check for any S-400 in this database)
    const existingSystem = data.vehicles.find(v => 
        v.id.includes('weapon-system-s400-triumf') || 
        (v.names && v.names.some(name => 
            name.value === 'S-400 Triumf' || 
            name.value === 'С-400 Триумф' ||
            name.value === 'SA-21 Growler'
        ))
    );
    
    if (existingSystem) {
        console.log(`ℹ️ S-400 Triumf already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingSystem.id);
        data.vehicles[index] = { ...s400MissileSystem, id: existingSystem.id };
    } else {
        // Add the system to the vehicles array
        data.vehicles.push(s400MissileSystem);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "air-defense-missile-system");
    if (!existingVehicleType) {
        data.vehicleTypes.push(airDefenseMissileSystemType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added S-400 Triumf missile system to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added system ID:', s400MissileSystem.id);
    console.log('🏷️ Vehicle type added:', airDefenseMissileSystemType.id);
    
    return data;
}

// Function to remove S-400 missile system from the JSON data
function removeS400MissileSystem() {
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
        
        // Remove S-400 from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the S-400
                const isS400System = 
                    vehicle.id.includes('weapon-system-s400-triumf') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'S-400 Triumf' || 
                        name.value === 'С-400 Триумф' ||
                        name.value === 'SA-21 Growler'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'SA-21 Growler' || 
                        id.value === '30K6E' ||
                        id.value === '98ZH6E'
                    )) ||
                    (vehicle.make === 'Almaz-Antey' && vehicle.model === 'S-400 Triumf');
                
                return !isS400System;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the air defense missile system type
        // (only if no other air defense systems remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherAirDefenseSystems = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'air-defense-missile-system'
            );
            
            if (!hasOtherAirDefenseSystems) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'air-defense-missile-system'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} S-400 Triumf record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed air-defense-missile-system vehicle type (no other systems found)');
            }
        } else {
            console.log(`ℹ️ No S-400 Triumf records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing S-400 Triumf:', error.message);
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
        
        // Check for any S-400 references
        let s400Refs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('s-400') ||
                    name.value.toLowerCase().includes('triumf') ||
                    name.value.toLowerCase().includes('sa-21') ||
                    name.value.toLowerCase().includes('growler')
                )) {
                    s400Refs++;
                    console.log(`   Found S-400 reference: ${vehicle.id}`);
                }
                
                if (vehicle.make === 'Almaz-Antey' && 
                    vehicle.model && vehicle.model.toLowerCase().includes('s-400')) {
                    s400Refs++;
                    console.log(`   Found S-400 reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   S-400 references found: ${s400Refs}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding S-400 Triumf to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add system to JSON file
        addS400MissileSystem();
        
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
            console.log(`   ✅ S-400 Triumf added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ S-400 Triumf added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing S-400 Triumf from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove system from JSON file
        console.log('🔍 Removing system from JSON file...');
        success = removeS400MissileSystem();
        
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
        
        if (refreshSuccess) {
            console.log('\n🎉 Remove operation completed successfully!');
            console.log(`   ✅ S-400 Triumf removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The S-400 Triumf should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ S-400 Triumf removed from ${OPERATION_CONFIG.displayName}`);
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

// Function to show usage information
function showUsage() {
    console.log('S-400 Triumf Management Script (Enhanced)');
    console.log('========================================\n');
    console.log('Usage:');
    console.log('  node s400_management.js --add [--db DATABASE]    Add S-400 Triumf to the database');
    console.log('  node s400_management.js --del [--db DATABASE]    Remove S-400 Triumf from the database');
    console.log('  node s400_management.js --list                   List available databases');
    console.log('  node s400_management.js --help                   Show this help message\n');
    console.log('Parameters:');
    console.log('  --db DATABASE    Specify target database (default: OP7)');
    console.log('                   Examples: OP1, OP2, OP3, OP4, OP5, OP6, OP7\n');
    console.log('Examples:');
    console.log('  node s400_management.js --add                    # Add to OP7 (Odesa Oblast)');
    console.log('  node s400_management.js --add --db OP1           # Add to OP1 (Kyiv Oblast)');
    console.log('  node s400_management.js --del --db OP3           # Remove from OP3 (Dnipro Oblast)');
    console.log('  node s400_management.js --list                   # Show all databases\n');
    console.log('Description:');
    console.log('  This script manages the S-400 Triumf missile system across multiple');
    console.log('  regional databases. It can add or remove the system from any specified');
    console.log('  database and automatically update the web interface if it\'s running.\n');
    console.log('Supported Databases:');
    Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
        console.log(`  ${key.padEnd(4)}: ${config.displayName.padEnd(18)} (${config.dataFile})`);
    });
    console.log('\nRequirements:');
    console.log('  - axios: npm install axios');
    console.log('  - Web interface running on http://127.0.0.1:8080 (optional for auto-reload)');
    console.log('  - Data files must exist in: C:\\ies4-military-database-analysis\\data\\');
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

// Function to parse command line arguments
function parseArguments() {
    const args = process.argv.slice(2);
    const config = {
        operation: null,
        database: 'OP7', // default
        showHelp: false,
        listDatabases: false
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--add':
                config.operation = 'add';
                break;
            case '--del':
            case '--remove':
                config.operation = 'remove';
                break;
            case '--list':
            case '--databases':
                config.listDatabases = true;
                break;
            case '--db':
            case '--database':
                if (i + 1 < args.length) {
                    config.database = args[i + 1].toUpperCase();
                    i++; // skip next argument
                } else {
                    console.error('❌ --db requires a database parameter');
                    process.exit(1);
                }
                break;
            case '--help':
            case '-h':
                config.showHelp = true;
                break;
            default:
                // Check if it's a database code without --db
                if (arg.match(/^OP\d+$/i)) {
                    config.database = arg.toUpperCase();
                } else if (!arg.startsWith('--')) {
                    console.error(`❌ Unknown argument: ${arg}`);
                    process.exit(1);
                }
                break;
        }
    }
    
    return config;
}

// Function to validate database selection
function validateDatabase(database) {
    if (!DATABASE_CONFIGS[database]) {
        console.error(`❌ Unknown database: ${database}`);
        console.error('Available databases:');
        Object.keys(DATABASE_CONFIGS).forEach(db => {
            console.error(`   ${db}: ${DATABASE_CONFIGS[db].displayName}`);
        });
        return false;
    }
    
    // Check if data file exists
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', DATABASE_CONFIGS[database].dataFile);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Data file not found: ${filePath}`);
        console.error(`   Database ${database} (${DATABASE_CONFIGS[database].displayName}) is not available`);
        console.error('   Please ensure the data file exists before proceeding');
        return false;
    }
    
    return true;
}

// Parse command line arguments and execute
async function main() {
    const config = parseArguments();
    
    // Handle help
    if (config.showHelp || (config.operation === null && !config.listDatabases)) {
        showUsage();
        return;
    }
    
    // Handle database listing
    if (config.listDatabases) {
        await listAvailableDatabases();
        return;
    }
    
    // Check dependencies
    checkDependencies();
    
    // Validate database selection
    if (!validateDatabase(config.database)) {
        process.exit(1);
    }
    
    // Initialize operation configuration
    initializeOperationConfig(config.database);
    
    // Execute the requested operation
    try {
        switch (config.operation) {
            case 'add':
                await performAddOperation();
                break;
            case 'remove':
                await performRemoveOperation();
                break;
            default:
                console.error('❌ No valid operation specified. Use --add, --del, --list, or --help');
                showUsage();
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Unhandled error in ${config.operation} operation:`, error);
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
    addS400MissileSystem,
    removeS400MissileSystem,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    DATABASE_CONFIGS,
    WEB_INTERFACE_CONFIG
};