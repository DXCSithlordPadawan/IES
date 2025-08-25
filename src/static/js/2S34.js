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

// Function to find the data directory
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

// Function to scan for actual JSON files in the data directory
function scanForJsonFiles() {
    const dataDir = findDataDirectory();
    console.log(`\n📂 Scanning for JSON files in: ${dataDir}`);
    
    if (!fs.existsSync(dataDir)) {
        console.log('❌ Data directory does not exist!');
        return [];
    }
    
    try {
        const files = fs.readdirSync(dataDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        console.log('📄 Found JSON files:');
        jsonFiles.forEach(file => {
            const filePath = path.join(dataDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
        
        return jsonFiles;
    } catch (error) {
        console.error('❌ Error reading directory:', error.message);
        return [];
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

// Function to display help information
function displayHelp() {
    console.log('🚁 2S34 Khosta Self-Propelled Howitzer Database Management Tool');
    console.log('================================================================\n');
    console.log('Usage: node 2S34.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add 2S34 Khosta howitzer to specified database');
    console.log('  --del              Remove 2S34 Khosta howitzer from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node 2S34.js --add --db OP7     Add 2S34 to Odesa Oblast database');
    console.log('  node 2S34.js --del --db OP1     Remove 2S34 from Donetsk Oblast database');
    console.log('  node 2S34.js --list             Show all available databases');
    console.log('  node 2S34.js --diagnostic       Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running 2S34.js Diagnostic Checks');
    console.log('====================================\n');
    
    // 1. Check current working directory
    console.log('1. 📁 Current Working Directory:');
    console.log(`   ${process.cwd()}\n`);
    
    // 2. Check data directory
    console.log('2. 📂 Data Directory Detection:');
    const dataDir = findDataDirectory();
    
    // 3. Scan for JSON files
    console.log('\n3. 📄 JSON File Detection:');
    const jsonFiles = scanForJsonFiles();
    
    // 4. Check database configurations
    console.log('\n4. ⚙️ Database Configuration Check:');
    Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
        const filePath = path.join(dataDir, config.dataFile);
        const exists = fs.existsSync(filePath);
        const status = exists ? '✅' : '❌';
        console.log(`   ${key}: ${config.displayName} - ${config.description} ${status}`);
    });
    
    // 5. Check web interface connectivity
    console.log('\n5. 🌐 Web Interface Connectivity:');
    checkWebInterface().then(isAccessible => {
        if (isAccessible) {
            console.log(`   ✅ Web interface is accessible at ${WEB_INTERFACE_CONFIG.baseUrl}`);
        } else {
            console.log(`   ❌ Web interface is not accessible at ${WEB_INTERFACE_CONFIG.baseUrl}`);
        }
    });
    
    // 6. Check file permissions
    console.log('\n6. 🔐 File Permissions Check:');
    Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
        const filePath = path.join(dataDir, config.dataFile);
        if (fs.existsSync(filePath)) {
            try {
                fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
                console.log(`   ${key}: ✅ Read/Write access OK`);
            } catch (error) {
                console.log(`   ${key}: ❌ Permission denied - ${error.message}`);
            }
        }
    });
    
    console.log('\n📋 Diagnostic Summary:');
    console.log('====================');
    console.log(`Data directory: ${dataDir}`);
    console.log(`JSON files found: ${jsonFiles.length}`);
    console.log(`Configured databases: ${Object.keys(DATABASE_CONFIGS).length}`);
    
    return true;
}

// Simplified versions of other functions for testing
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

// Function to clear any cached data that might contain 2S34
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

// Function to add 2S34 Khosta self-propelled howitzer to the JSON data
function add2S34Howitzer() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const vehicleId = `vehicle-2s34-howitzer-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the 2S34 Khosta howitzer entry following IES4 schema
    const khosta2S34 = {
        "id": vehicleId,
        "uri": "https://en.wikipedia.org/wiki/2S1_Gvozdika#Variants",
        "type": "Vehicle",
        "subtype": "Self-Propelled Artillery",
        "names": [
            {
                "value": "2S34 Khosta",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "2С34 Хоста",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Khosta",
                "language": "en",
                "nameType": "designation"
            }
        ],
        "identifiers": [
            {
                "value": "2S34",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Russian Ministry of Defense"
            },
            {
                "value": "Khosta",
                "identifierType": "SYSTEM_NAME",
                "issuingAuthority": "Russian Military"
            },
            {
                "value": "2S1 Gvozdika Variant",
                "identifierType": "PLATFORM_FAMILY",
                "issuingAuthority": "Russian Military"
            }
        ],
        "vehicleType": "self-propelled-howitzer",
        "manufacturer": "Russian Defense Industry",
        "model": "2S34 Khosta",
        "firstProduced": 2010,
        "enteredService": 2015,
        "operator": "Russian Armed Forces",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "2s34-wiki",
                "type": "webpage",
                "title": "2S1 Gvozdika Variants - Wikipedia",
                "description": "Wikipedia article about the 2S1 Gvozdika variants including the 2S34 Khosta",
                "url": "https://en.wikipedia.org/wiki/2S1_Gvozdika#Variants"
            }
        ],
        "temporalParts": [
            {
                "id": "2s34-development-start",
                "stateType": "development_initiated",
                "startTime": "2008-01-01T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": "2s34-prototype-complete",
                "stateType": "prototype_completed",
                "startTime": "2010-01-01T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": "2s34-production-start",
                "stateType": "production_started",
                "startTime": "2012-01-01T00:00:00Z",
                "location": "Russia"
            },
            {
                "id": "2s34-service-entry",
                "stateType": "entered_service",
                "startTime": "2015-01-01T00:00:00Z",
                "location": "Russian Armed Forces"
            },
            {
                "id": `2s34-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `2s34-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional vehicle-specific properties
        "specifications": {
            "length": "7.5 m",
            "width": "2.85 m",
            "height": "2.73 m",
            "combatWeight": "16,000 kg",
            "crew": 4,
            "classification": "Self-propelled howitzer",
            "engine": "YaMZ-238 V8 diesel engine",
            "maxSpeed": "60 km/h (road), 8 km/h (water)",
            "operationalRange": "500 km",
            "mainArmament": "122 mm 2A31 howitzer",
            "secondaryArmament": "7.62 mm PKT machine gun",
            "ammunition": "40 rounds",
            "firingRange": "15.2 km (standard), 21.9 km (extended range)",
            "armor": "Steel armor protection",
            "mobility": "Amphibious capability",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "2S1 Gvozdika (base model)",
            "2S34 Khosta (modernized)",
            "2S1M (upgrade)"
        ],
        "capabilities": [
            "indirect fire support",
            "amphibious operations",
            "mobile artillery",
            "close fire support",
            "rapid deployment",
            "all-terrain mobility"
        ]
    };
    
    // Create vehicle type definition for self-propelled howitzers
    const selfPropelledHowitzerType = {
        "id": "self-propelled-howitzer",
        "name": "Self-Propelled Howitzer",
        "category": "military vehicle",
        "subcategory": "artillery system",
        "description": "Mobile artillery system with integrated howitzer on tracked chassis",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "indirect fire support",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "4",
                "dataType": "number"
            },
            {
                "name": "caliber_mm",
                "value": "122",
                "dataType": "number"
            },
            {
                "name": "amphibious_capable",
                "value": "true",
                "dataType": "boolean"
            },
            {
                "name": "self_propelled",
                "value": "true",
                "dataType": "boolean"
            },
            {
                "name": "max_range_km",
                "value": "21.9",
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
    
    // Check if 2S34 already exists (check for any 2S34 in this database)
    const existingVehicle = data.vehicles.find(v => 
        v.id.includes('vehicle-2s34-howitzer') || 
        (v.names && v.names.some(name => 
            name.value === '2S34 Khosta' || 
            name.value === '2С34 Хоста' ||
            name.value === 'Khosta'
        ))
    );
    
    if (existingVehicle) {
        console.log(`ℹ️ 2S34 Khosta howitzer already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingVehicle.id);
        data.vehicles[index] = { ...khosta2S34, id: existingVehicle.id };
    } else {
        // Add the vehicle to the vehicles array
        data.vehicles.push(khosta2S34);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "self-propelled-howitzer");
    if (!existingVehicleType) {
        data.vehicleTypes.push(selfPropelledHowitzerType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added 2S34 Khosta howitzer to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vehicle ID:', khosta2S34.id);
    console.log('🏷️ Vehicle type added:', selfPropelledHowitzerType.id);
    
    return data;
}

// Function to remove 2S34 Khosta howitzer from the JSON data
function remove2S34Howitzer() {
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
        
        // Remove 2S34 from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the 2S34
                const is2S34Vehicle = 
                    vehicle.id.includes('vehicle-2s34-howitzer') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === '2S34 Khosta' || 
                        name.value === '2С34 Хоста' ||
                        name.value === 'Khosta'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === '2S34' || 
                        id.value === 'Khosta' ||
                        id.value === '2S1 Gvozdika Variant'
                    ));
                
                return !is2S34Vehicle;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the self-propelled howitzer type
        // (only if no other self-propelled howitzers remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherSelfPropelledHowitzers = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'self-propelled-howitzer'
            );
            
            if (!hasOtherSelfPropelledHowitzers) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'self-propelled-howitzer'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} 2S34 Khosta howitzer record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed self-propelled-howitzer vehicle type (no other howitzers found)');
            }
        } else {
            console.log(`ℹ️ No 2S34 Khosta howitzer records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing 2S34 Khosta howitzer:', error.message);
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
        
        // Check for any remaining 2S34 references
        let remainingRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('2s34') || 
                    name.value.toLowerCase().includes('khosta') ||
                    name.value.toLowerCase().includes('хоста')
                )) {
                    remainingRefs++;
                    console.log(`   Found 2S34 reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   2S34 references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining 2S34 Khosta howitzer references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding 2S34 Khosta howitzer to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add howitzer to JSON file
        add2S34Howitzer();
        
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
            console.log(`   ✅ 2S34 Khosta howitzer added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 2S34 Khosta howitzer added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing 2S34 Khosta howitzer from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove howitzer from JSON file
        console.log('🔍 Removing howitzer from JSON file...');
        success = remove2S34Howitzer();
        
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
            console.log(`   ✅ 2S34 Khosta howitzer removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The 2S34 Khosta howitzer should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 2S34 Khosta howitzer removed from ${OPERATION_CONFIG.displayName}`);
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

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Handle no arguments or help request
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        displayHelp();
        process.exit(0);
    }
    
    try {
        // Check for old format: "<database> <operation>"
        if (args.length >= 2 && !args[0].startsWith('--') && !args[1].startsWith('--')) {
            const database = args[0].toUpperCase();
            const operation = args[1].toLowerCase();
            
            // Special case for "list list" command
            if (operation === 'list') {
                listAvailableDatabases();
                return;
            }
            
            // Validate database
            if (!DATABASE_CONFIGS[database]) {
                console.error(`❌ Invalid database: ${database}`);
                console.error('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
                process.exit(1);
            }
            
            // Initialize and perform operation (legacy format)
            initializeOperationConfig(database);
            if (operation === 'add') {
                performAddOperation();
            } else if (operation === 'remove') {
                performRemoveOperation();
            } else {
                console.error(`❌ Unknown operation: ${operation}`);
                console.log('Available operations: add, remove, list');
                process.exit(1);
            }
            return;
        }
        
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
            listAvailableDatabases();
            return;
        }
        
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
            console.log('\n💡 Try running: node 2S34.js --diagnostic');
            process.exit(1);
        }
        
        // Execute command
        switch (parsedArgs.command) {
            case 'add':
                performAddOperation();
                break;
            case 'remove':
                performRemoveOperation();
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

// Export functions for potential module use
module.exports = {
    initializeOperationConfig,
    add2S34Howitzer,
    remove2S34Howitzer,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    verifyFileStructure
};