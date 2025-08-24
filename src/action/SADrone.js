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
    console.log('🛩️ Sokol Altius Drone Database Management Tool');
    console.log('===============================================\n');
    console.log('Usage: node SADrone.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add Sokol Altius drone to specified database');
    console.log('  --del              Remove Sokol Altius drone from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Alternative Usage (Legacy Format):');
    console.log('  add <database>     Add Sokol Altius drone to specified database');
    console.log('  remove <database>  Remove Sokol Altius drone from specified database\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node SADrone.js --add --db OP7      Add Sokol Altius drone to Odesa Oblast database');
    console.log('  node SADrone.js --del --db OP1      Remove Sokol Altius drone from Donetsk Oblast database');
    console.log('  node SADrone.js add OP7             Add Sokol Altius drone to Odesa Oblast (legacy)');
    console.log('  node SADrone.js --list              Show all available databases');
    console.log('  node SADrone.js --diagnostic        Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running SADrone.js Diagnostic Checks');
    console.log('========================================\n');
    
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
        console.log(`   ${key}: ${config.dataFile} ${status}`);
        
        if (exists) {
            try {
                const stats = fs.statSync(filePath);
                console.log(`       Size: ${(stats.size / 1024).toFixed(2)} KB`);
                
                // Try to parse JSON
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                console.log(`       Aircraft count: ${data.aircraft ? data.aircraft.length : 0}`);
                console.log(`       Areas count: ${data.areas ? data.areas.length : 0}`);
            } catch (error) {
                console.log(`       ❌ Error reading file: ${error.message}`);
            }
        }
    });
    
    // 5. Check web interface connectivity
    console.log('\n5. 🌐 Web Interface Check:');
    checkWebInterface().then(isRunning => {
        if (isRunning) {
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

// Function to initialize operation configuration with better error handling
function initializeOperationConfig(database) {
    console.log(`\n🎯 Initializing operation for database: ${database}`);
    
    OPERATION_CONFIG.database = database;
    
    const dbConfig = DATABASE_CONFIGS[database];
    if (dbConfig) {
        OPERATION_CONFIG.dataFile = dbConfig.dataFile;
        OPERATION_CONFIG.displayName = dbConfig.displayName;
        
        // Check if the data file actually exists
        const dataDir = findDataDirectory();
        const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
        
        console.log(`📁 Data file path: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
            console.log('✅ Data file exists');
            try {
                const stats = fs.statSync(filePath);
                console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
                
                // Test JSON parsing
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                console.log(`✅ JSON is valid`);
                console.log(`📈 Contains ${data.aircraft ? data.aircraft.length : 0} aircraft entries`);
                
            } catch (error) {
                console.error(`❌ Error reading/parsing file: ${error.message}`);
                throw new Error(`Invalid JSON file: ${filePath}`);
            }
        } else {
            console.error(`❌ Data file not found: ${filePath}`);
            throw new Error(`Data file not found: ${filePath}`);
        }
    } else {
        console.error(`❌ Unknown database: ${database}`);
        console.log('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
        throw new Error(`Unknown database: ${database}`);
    }
    
    console.log(`✅ Operation initialized for ${OPERATION_CONFIG.displayName}`);
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

// Function to clear any cached data that might contain Sokol Altius
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

// Function to add Sokol Altius drone to the JSON data
function addSokolAltiusDrone() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const droneId = `vehicle-sokol-altius-drone-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Sokol Altius drone entry following IES4 schema
    const sokolAltiusDrone = {
        "id": droneId,
        "uri": "https://en.wikipedia.org/wiki/Sokol_Altius",
        "type": "Vehicle",
        "names": [
            {
                "value": "Sokol Altius",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Сокол Альтиус",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Altius-U",
                "language": "en",
                "nameType": "variant"
            }
        ],
        "identifiers": [
            {
                "value": "Altius",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Sokol Design Bureau"
            },
            {
                "value": "Altius-U",
                "identifierType": "VARIANT_CODE",
                "issuingAuthority": "Sokol Design Bureau"
            },
            {
                "value": "UCAV",
                "identifierType": "CLASSIFICATION",
                "issuingAuthority": "Russian Federation"
            }
        ],
        "vehicleType": "unmanned-combat-aerial-vehicle",
        "make": "Sokol Design Bureau",
        "model": "Altius",
        "year": 2016,
        "owner": "Russian Federation",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "sokol-altius-wiki",
                "type": "webpage",
                "title": "Sokol Altius - Wikipedia",
                "description": "Wikipedia article about the Sokol Altius unmanned combat aerial vehicle",
                "url": "https://en.wikipedia.org/wiki/Sokol_Altius"
            }
        ],
        "temporalParts": [
            {
                "id": "altius-development-start",
                "stateType": "development_started",
                "startTime": "2011-01-01T00:00:00Z",
                "location": "Sokol Design Bureau, Kazan"
            },
            {
                "id": "altius-first-flight",
                "stateType": "first_flight",
                "startTime": "2016-08-12T00:00:00Z",
                "location": "Kazan, Russia"
            },
            {
                "id": "altius-production-start",
                "stateType": "production_started",
                "startTime": "2020-01-01T00:00:00Z",
                "location": "Sokol Design Bureau, Kazan"
            },
            {
                "id": "altius-service-entry",
                "stateType": "entered_service",
                "startTime": "2022-01-01T00:00:00Z",
                "location": "Russian Armed Forces"
            },
            {
                "id": `altius-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `altius-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional drone-specific properties
        "specifications": {
            "maxTakeoffWeight": "6,000 kg",
            "length": "11.6 m",
            "wingspan": "28.5 m",
            "height": "4.0 m",
            "crew": 0,
            "classification": "Unmanned Combat Aerial Vehicle (UCAV)",
            "payload": "Up to 2,000 kg",
            "engine": "RED A03 diesel engine",
            "powerOutput": "500 hp",
            "maxSpeed": "440 km/h",
            "cruiseSpeed": "200 km/h",
            "serviceceiling": "12,000 m",
            "endurance": "48 hours",
            "operationalRange": "10,000 km",
            "deploymentRegion": OPERATION_CONFIG.displayName,
            "armament": "Guided missiles, bombs, reconnaissance equipment"
        },
        "variants": [
            "Altius",
            "Altius-U",
            "Altius-M",
            "Altius-RU"
        ],
        "capabilities": [
            "Long-range reconnaissance",
            "Intelligence gathering",
            "Surveillance missions",
            "Combat operations",
            "Electronic warfare",
            "Target designation"
        ]
    };
    
    // Create vehicle type definition for unmanned combat aerial vehicles
    const ucavType = {
        "id": "unmanned-combat-aerial-vehicle",
        "name": "Unmanned Combat Aerial Vehicle",
        "category": "aircraft",
        "subcategory": "drone",
        "description": "Unmanned combat aerial vehicle designed for reconnaissance and combat missions",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "unmanned combat aerial vehicle",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "0",
                "dataType": "number"
            },
            {
                "name": "max_takeoff_weight_kg",
                "value": "6000",
                "dataType": "number"
            },
            {
                "name": "wingspan_m",
                "value": "28.5",
                "dataType": "number"
            },
            {
                "name": "engine_type",
                "value": "diesel_engine",
                "dataType": "string"
            },
            {
                "name": "endurance_hours",
                "value": "48",
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
    
    // Check if Sokol Altius already exists (check for any Altius in this database)
    const existingDrone = data.vehicles.find(v => 
        v.id.includes('vehicle-sokol-altius-drone') || 
        (v.names && v.names.some(name => 
            name.value === 'Sokol Altius' || 
            name.value === 'Сокол Альтиус' ||
            name.value === 'Altius'
        ))
    );
    
    if (existingDrone) {
        console.log(`ℹ️ Sokol Altius drone already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.vehicles.findIndex(v => v.id === existingDrone.id);
        data.vehicles[index] = { ...sokolAltiusDrone, id: existingDrone.id };
    } else {
        // Add the drone to the vehicles array
        data.vehicles.push(sokolAltiusDrone);
    }
    
    // Add the vehicle type if it doesn't already exist
    const existingVehicleType = data.vehicleTypes.find(vt => vt.id === "unmanned-combat-aerial-vehicle");
    if (!existingVehicleType) {
        data.vehicleTypes.push(ucavType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Sokol Altius drone to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added vehicle ID:', sokolAltiusDrone.id);
    console.log('🏷️ Vehicle type added:', ucavType.id);
    
    return data;
}

// Function to remove Sokol Altius drone from the JSON data
function removeSokolAltiusDrone() {
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
        
        // Remove Sokol Altius from vehicles array
        if (data.vehicles && Array.isArray(data.vehicles)) {
            const initialLength = data.vehicles.length;
            data.vehicles = data.vehicles.filter(vehicle => {
                // Check multiple possible identifiers for the Sokol Altius
                const isSokolAltius = 
                    vehicle.id.includes('vehicle-sokol-altius-drone') ||
                    (vehicle.names && vehicle.names.some(name => 
                        name.value === 'Sokol Altius' || 
                        name.value === 'Сокол Альтиус' ||
                        name.value === 'Altius' ||
                        name.value === 'Altius-U'
                    )) ||
                    (vehicle.identifiers && vehicle.identifiers.some(id => 
                        id.value === 'Altius' || 
                        id.value === 'Altius-U' ||
                        id.value === 'UCAV'
                    ));
                
                return !isSokolAltius;
            });
            
            removedCount = initialLength - data.vehicles.length;
        }
        
        // Check if we should remove the UCAV type
        // (only if no other UCAVs remain)
        if (data.vehicleTypes && Array.isArray(data.vehicleTypes)) {
            const hasOtherUCAVs = data.vehicles && data.vehicles.some(vehicle => 
                vehicle.vehicleType === 'unmanned-combat-aerial-vehicle'
            );
            
            if (!hasOtherUCAVs) {
                const initialTypeLength = data.vehicleTypes.length;
                data.vehicleTypes = data.vehicleTypes.filter(vt => 
                    vt.id !== 'unmanned-combat-aerial-vehicle'
                );
                removedVehicleType = initialTypeLength > data.vehicleTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Sokol Altius drone record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedVehicleType) {
                console.log('✅ Also removed unmanned-combat-aerial-vehicle vehicle type (no other UCAVs found)');
            }
        } else {
            console.log(`ℹ️ No Sokol Altius drone records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Sokol Altius drone:', error.message);
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
        
        // Check for any remaining Sokol Altius references
        let remainingRefs = 0;
        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                if (vehicle.names && vehicle.names.some(name => 
                    name.value.toLowerCase().includes('altius') || 
                    name.value.toLowerCase().includes('альтиус') ||
                    name.value.toLowerCase().includes('sokol')
                )) {
                    remainingRefs++;
                    console.log(`   Found Sokol Altius reference: ${vehicle.id}`);
                }
            });
        }
        
        console.log(`   Sokol Altius references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining Sokol Altius drone references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding Sokol Altius drone to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add drone to JSON file
        addSokolAltiusDrone();
        
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
            console.log(`   ✅ Sokol Altius drone added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Sokol Altius drone added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing Sokol Altius drone from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove drone from JSON file
        console.log('🔍 Removing drone from JSON file...');
        success = removeSokolAltiusDrone();
        
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
            console.log(`   ✅ Sokol Altius drone removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Sokol Altius drone should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Sokol Altius drone removed from ${OPERATION_CONFIG.displayName}`);
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
    
    const dataDir = findDataDirectory();
    
    Object.entries(DATABASE_CONFIGS).forEach(([key, config]) => {
        const filePath = path.join(dataDir, config.dataFile);
        const exists = fs.existsSync(filePath) ? '✅' : '❌';
        console.log(`   ${key}: ${config.displayName} - ${config.description} ${exists}`);
        
        if (exists) {
            try {
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                console.log(`       📊 Size: ${(stats.size / 1024).toFixed(2)} KB, Aircraft: ${data.aircraft ? data.aircraft.length : 0}`);
            } catch (error) {
                console.log(`       ❌ Error reading: ${error.message}`);
            }
        }
    });
}

// Export functions for use in other modules
module.exports = {
    initializeOperationConfig,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    addSokolAltiusDrone,
    removeSokolAltiusDrone,
    verifyFileStructure,
    OPERATION_CONFIG,
    DATABASE_CONFIGS
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Handle no arguments or help request
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        displayHelp();
        process.exit(0);
    }
    
    try {
        // Check for old format: "add <database>" or "remove <database>"
        if ((args[0] === 'add' || args[0] === 'remove') && args.length >= 2) {
            const command = args[0];
            const database = args[1].toUpperCase();
            
            // Validate database
            if (!DATABASE_CONFIGS[database]) {
                console.error(`❌ Invalid database: ${database}`);
                console.error('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
                process.exit(1);
            }
            
            // Initialize and perform operation (legacy format)
            initializeOperationConfig(database);
            if (command === 'add') {
                performAddOperation();
            } else {
                performRemoveOperation();
            }
            return;
        }
        
        // Check for legacy format: "add" or "remove" without database (defaults to OP7)
        if (args[0] === 'add' || args[0] === 'remove') {
            const command = args[0];
            const database = 'OP7';
            
            // Initialize and perform operation (legacy format with default database)
            initializeOperationConfig(database);
            if (command === 'add') {
                performAddOperation();
            } else {
                performRemoveOperation();
            }
            return;
        }
        
        // Check for legacy list command
        if (args[0] === 'list') {
            listAvailableDatabases();
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
            console.log('\n💡 Try running: node SADrone.js --diagnostic');
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