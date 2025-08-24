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

// Function to clear any cached data that might contain Admiral Chabanenko
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

// Function to add Admiral Chabanenko vessel to the JSON data
function addAdmiralChabanenko() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const vesselId = `vessel-admiral-chabanenko-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Admiral Chabanenko vessel entry following IES4 schema
    const admiralChabanenko = {
        "id": vesselId,
        "uri": "https://en.wikipedia.org/wiki/Russian_destroyer_Admiral_Chabanenko",
        "type": "Vehicle",
        "names": [
            {
                "value": "Admiral Chabanenko",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Адмирал Чабаненко",
                "language": "ru",
                "nameType": "official"
            }
        ],
        "identifiers": [
            {
                "value": "Project 1155.1",
                "identifierType": "PROJECT_CODE",
                "issuingAuthority": "Russian Navy"
            },
            {
                "value": "Udaloy II class",
                "identifierType": "CLASS_DESIGNATION",
                "issuingAuthority": "NATO"
            }
        ],
        "vehicleType": "naval-vessel-destroyer",
        "make": "Kaliningrad Shipyard",
        "model": "Udaloy II class",
        "year": 1999,
        "owner": "Russian Navy",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "admiral-chabanenko-wiki",
                "type": "webpage",
                "title": "Russian destroyer Admiral Chabanenko - Wikipedia",
                "description": "Wikipedia article about the Admiral Chabanenko destroyer",
                "url": "https://en.wikipedia.org/wiki/Russian_destroyer_Admiral_Chabanenko"
            }
        ],
        "temporalParts": [
            {
                "id": "admiral-chabanenko-laid-down",
                "stateType": "laid_down",
                "startTime": "1989-01-01T00:00:00Z",
                "location": "Kaliningrad Shipyard"
            },
            {
                "id": "admiral-chabanenko-commissioned",
                "stateType": "commissioned",
                "startTime": "1999-01-01T00:00:00Z",
                "location": "Northern Fleet"
            },
            {
                "id": "admiral-chabanenko-panama-canal",
                "stateType": "historical_transit",
                "startTime": "2008-12-06T00:00:00Z",
                "location": "Panama Canal"
            },
            {
                "id": "admiral-chabanenko-overhaul",
                "stateType": "maintenance",
                "startTime": "2013-12-01T00:00:00Z",
                "endTime": "2025-01-01T00:00:00Z",
                "location": "Murmansk"
            },
            {
                "id": `admiral-chabanenko-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `admiral-chabanenko-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "maintenance",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional vessel-specific properties
        "specifications": {
            "displacement": {
                "standard": "6200 tonnes",
                "full_load": "7900 tonnes"
            },
            "dimensions": {
                "length": "163 m",
                "beam": "19.3 m",
                "draught": "6.2 m"
            },
            "classification": "Anti-submarine destroyer",
            "fleet": "Northern Fleet",
            "propulsion": {
                "type": "COGAG",
                "engines": "4 × gas turbines",
                "power": "65,000 hp"
            },
            "speed": {
                "maximum": "35 knots",
                "cruising": "20 knots"
            },
            "armament": {
                "missiles": [
                    "8 × SS-N-22 Sunburn anti-ship missiles",
                    "64 × SA-N-9 Gauntlet SAM"
                ],
                "guns": [
                    "1 × 100mm AK-100 gun",
                    "4 × 30mm AK-630 CIWS"
                ],
                "torpedoes": "2 × quadruple 533mm torpedo tubes",
                "asw": "2 × RBU-6000 anti-submarine rocket launchers"
            },
            "sensors": {
                "radar": [
                    "Fregat-M2EM 3D air search",
                    "Palm Frond navigation"
                ],
                "sonar": "Zvezda M-2 hull-mounted"
            },
            "aircraft": "2 × Ka-27 helicopters",
            "crew": 300,
            "namedAfter": "Admiral Andrei Chabanenko",
            "currentStatus": "Under modernization since 2013",
            "deploymentRegion": OPERATION_CONFIG.displayName
        }
    };
    
    // Create vehicle type definition for naval vessels
    const navalVesselType = {
        "id": "naval-vessel-destroyer",
        "name": "Naval Destroyer",
        "category": "naval vessel",
        "subcategory": "destroyer",
        "description": "Anti-submarine warfare destroyer vessel",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "anti-submarine warfare",
                "dataType": "string"
            },
            {
                "name": "vessel_class",
                "value": "Udaloy II",
                "dataType": "string"
            },
            {
                "name": "displacement_standard",
                "value": "6200",
                "dataType": "number"
            },
            {
                "name": "displacement_full",
                "value": "7900",
                "dataType": "number"
            },
            {
                "name": "crew_size",
                "value": "300",
                "dataType": "number"
            },
            {
                "name": "max_speed_knots",
                "value": "35",
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
    
    // Check if Admiral Chabanenko already exists (check for any Admiral Chabanenko in this database)
    const existingVessel = data.vehicles.find(v => 
        v.id.includes('vessel-admiral-chabanenko') || 
        (v.names && v.names.some(name => 
            name.value === 'Admiral Chabanenko' || 
            name.value === 'Адмирал Чабаненко'
        ))
    );
    
    if (existingVessel) {
        console.log(`ℹ️ Admiral Chabanenko already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingVessel.id);
        data.vehicles[index] = { ...admiralChabanenko, id: existingVessel.id };
    } else {
        // Add the vessel to the vehicles array
        data.vehicles.push(admiralChabanenko);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "naval-vessel-destroyer");
    if (!existingVehicleType) {
        data.vehicleTypes.push(navalVesselType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Admiral Chabanenko vessel to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vessel ID:', admiralChabanenko.id);
    console.log('🏷️ Vehicle type added:', navalVesselType.id);
    
    return data;
}

// Function to remove Admiral Chabanenko vessel from the JSON data
function removeAdmiralChabanenko() {
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
        
        // Remove Admiral Chabanenko from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the Admiral Chabanenko
                const isAdmiralChabanenko = 
                    vehicle.id.includes('vessel-admiral-chabanenko') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'Admiral Chabanenko' || 
                        name.value === 'Адмирал Чабаненко'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'Project 1155.1' || 
                        id.value === 'Udaloy II class'
                    )) ||
                    (vehicle.make === 'Kaliningrad Shipyard' && vehicle.model === 'Udaloy II class');
                
                return !isAdmiralChabanenko;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the naval vessel destroyer type
        // (only if no other naval destroyers remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherNavalDestroyers = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'naval-vessel-destroyer'
            );
            
            if (!hasOtherNavalDestroyers) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'naval-vessel-destroyer'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Admiral Chabanenko record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed naval-vessel-destroyer vehicle type (no other destroyers found)');
            }
        } else {
            console.log(`ℹ️ No Admiral Chabanenko records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Admiral Chabanenko:', error.message);
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
        
        // Check for any Admiral Chabanenko references
        let chabanenkoRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('chabanenko') ||
                    name.value.toLowerCase().includes('чабаненко')
                )) {
                    chabanenkoRefs++;
                    console.log(`   Found Admiral Chabanenko reference: ${vehicle.id}`);
                }
                
                if (vehicle.make === 'Kaliningrad Shipyard' && 
                    vehicle.model && vehicle.model.toLowerCase().includes('udaloy')) {
                    chabanenkoRefs++;
                    console.log(`   Found Admiral Chabanenko reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   Admiral Chabanenko references found: ${chabanenkoRefs}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚢 Adding Admiral Chabanenko to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add vessel to JSON file
        addAdmiralChabanenko();
        
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
            console.log(`   ✅ Admiral Chabanenko added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Admiral Chabanenko added to ${OPERATION_CONFIG.displayName}`);
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
    console.log('Admiral Chabanenko Management Script (Enhanced)');
    console.log('==============================================\n');
    console.log('Usage:');
    console.log('  node admiral_management.js --add [--db DATABASE]    Add Admiral Chabanenko to the database');
    console.log('  node admiral_management.js --del [--db DATABASE]    Remove Admiral Chabanenko from the database');
    console.log('  node admiral_management.js --list                   List available databases');
    console.log('  node admiral_management.js --help                   Show this help message\n');
    console.log('Parameters:');
    console.log('  --db DATABASE    Specify target database (default: OP7)');
    console.log('                   Examples: OP1, OP2, OP3, OP4, OP5, OP6, OP7\n');
    console.log('Examples:');
    console.log('  node admiral_management.js --add                    # Add to OP7 (Odesa Oblast)');
    console.log('  node admiral_management.js --add --db OP1           # Add to OP1 (Kyiv Oblast)');
    console.log('  node admiral_management.js --del --db OP3           # Remove from OP3 (Dnipro Oblast)');
    console.log('  node admiral_management.js --list                   # Show all databases\n');
    console.log('Description:');
    console.log('  This script manages the Admiral Chabanenko destroyer across multiple');
    console.log('  regional databases. It can add or remove the vessel from any specified');
    console.log('  database and automatically update the web interface if running.\n');
    console.log('Vessel Details:');
    console.log('  - Udaloy II-class destroyer (Project 1155.1)');
    console.log('  - Displacement: 7,900 tonnes (full load)');
    console.log('  - Length: 163 m, Beam: 19.3 m, Crew: 300');
    console.log('  - Primary role: Anti-submarine warfare');
    console.log('  - Commissioned: 1999, Northern Fleet');
    console.log('  - Current status: Under modernization since 2013\n');
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
    addAdmiralChabanenko,
    removeAdmiralChabanenko,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    DATABASE_CONFIGS,
    WEB_INTERFACE_CONFIG
};

// Main remove operation
async function performRemoveOperation() {
    console.log(`🚢 Removing Admiral Chabanenko from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove vessel from JSON file
        console.log('🔍 Removing vessel from JSON file...');
        success = removeAdmiralChabanenko();
        
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
            console.log(`   ✅ Admiral Chabanenko removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Admiral Chabanenko should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Admiral Chabanenko removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ❌ Analysis refresh failed');
            console.log('💡 Open the Analysis page and the auto-refresh will pick up the changes');
        }
        
        verifyFileStructure();
        
    } catch (error) {
        console.error('\n❌ Error during remove operation:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}