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
    console.log('🎖️ 35th Guards Motor Rifle Brigade Database Management Tool');
    console.log('=========================================================\n');
    console.log('Usage: node 35GdsMRBde.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add 35th Guards Motor Rifle Brigade to specified database');
    console.log('  --del              Remove 35th Guards Motor Rifle Brigade from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Alternative Usage (Legacy Format):');
    console.log('  add <database>     Add 35th Guards Motor Rifle Brigade to specified database');
    console.log('  remove <database>  Remove 35th Guards Motor Rifle Brigade from specified database\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node 35GdsMRBde.js --add --db OP7      Add 35th Guards to Odesa Oblast database');
    console.log('  node 35GdsMRBde.js --del --db OP1      Remove 35th Guards from Donetsk Oblast database');
    console.log('  node 35GdsMRBde.js add OP7             Add 35th Guards to Odesa Oblast (legacy)');
    console.log('  node 35GdsMRBde.js --list              Show all available databases');
    console.log('  node 35GdsMRBde.js --diagnostic        Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running 35GdsMRBde.js Diagnostic Checks');
    console.log('===========================================\n');
    
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
                console.log(`       Units count: ${data.units ? data.units.length : 0}`);
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
                console.log(`📈 Contains ${data.units ? data.units.length : 0} unit entries`);
                
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
    // Define the file path
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    
    console.log(`\n🔧 Adding 35th Guards Motor Rifle Brigade to file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Check file permissions
    try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        console.log('✅ File permissions OK');
    } catch (error) {
        throw new Error(`File permission denied: ${filePath} - ${error.message}`);
    }
    
    let data;
    try {
        // Read the existing JSON file
        console.log('📖 Reading existing file...');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(fileContent);
        console.log('✅ File parsed successfully');
    } catch (error) {
        throw new Error(`Failed to read/parse JSON file: ${error.message}`);
    }
    
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
    
    // Add units array if it doesn't exist
    if (!data.units) {
        data.units = [];
    }
    
    // Add unitTypes array if it doesn't exist
    if (!data.unitTypes) {
        data.unitTypes = [];
    }
    
    // Check if 35th Guards Motor Rifle Brigade already exists
    const existingBrigade = data.units.find(u => 
        u.id.includes('unit-35-gds-mrb') || 
        (u.names && u.names.some(name => 
            name.value.includes('35th Guards Motor Rifle Brigade') || 
            name.value.includes('35-я гвардейская мотострелковая бригада')
        ))
    );
    
    if (existingBrigade) {
        console.log(`ℹ️ 35th Guards Motor Rifle Brigade already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.units.findIndex(u => u.id === existingBrigade.id);
        data.units[index] = { ...guardsBrigade, id: existingBrigade.id };
    } else {
        // Add the brigade to the units array
        data.units.push(guardsBrigade);
    }
    
    // Add the unit type if it doesn't already exist
    const existingUnitType = data.unitTypes.find(ut => ut.id === "motor-rifle-brigade");
    if (!existingUnitType) {
        data.unitTypes.push(motorRifleBrigadeType);
    }
    
    try {
        // Create backup first
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(dataDir, `${path.basename(OPERATION_CONFIG.dataFile, '.json')}_backup_${timestamp}.json`);
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup created: ${backupPath}`);
        
        // Write the updated data back to the file
        console.log('💾 Writing updated data to file...');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ File written successfully');
        
        // Verify the write
        const verifyContent = fs.readFileSync(filePath, 'utf8');
        const verifyData = JSON.parse(verifyContent);
        console.log(`✅ Verification: File contains ${verifyData.units ? verifyData.units.length : 0} unit entries`);
        
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
    
    console.log(`✅ Successfully added 35th Guards Motor Rifle Brigade to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added unit ID:', guardsBrigade.id);
    console.log('🏷️ Unit type added:', motorRifleBrigadeType.id);
    
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
        
        // Remove 35th Guards Motor Rifle Brigade from units array
        if (data.units && Array.isArray(data.units)) {
            const initialLength = data.units.length;
            data.units = data.units.filter(unit => {
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
            
            removedCount = initialLength - data.units.length;
        }
        
        // Check if we should remove the motor rifle brigade type
        // (only if no other motor rifle brigades remain)
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
            const hasOtherMotorRifleBrigades = data.units && data.units.some(unit => 
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
        console.log(`   Units: ${data.units ? data.units.length : 0}`);
        console.log(`   Unit Types: ${data.unitTypes ? data.unitTypes.length : 0}`);
        
        // Check for any remaining 35th Guards Motor Rifle Brigade references
        let remainingRefs = 0;
        if (data.units) {
            data.units.forEach(unit => {
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
                    console.log(`       📊 Size: ${(stats.size / 1024).toFixed(2)} KB, Units: ${data.units ? data.units.length : 0}`);
                } catch (error) {
                    console.log(`       ❌ Error reading: ${error.message}`);
                }
            }
        });
        
        if (!isWebRunning) {
            console.log('\n⚠️ Web interface not running - showing local configuration only');
            console.log('   Start web interface for live database status');
        }
    }

    console.log('\n💡 Usage:');
    console.log('   node 35GdsMRBde.js --add --db <database>     - Add 35th Guards Motor Rifle Brigade');
    console.log('   node 35GdsMRBde.js --del --db <database>     - Remove 35th Guards Motor Rifle Brigade');
    console.log('   node 35GdsMRBde.js --list                    - Show available databases');
    console.log('   node 35GdsMRBde.js --help                    - Show help information');
    console.log('   node 35GdsMRBde.js --diagnostic              - Run diagnostic checks');
    console.log('\n📖 Examples:');
    console.log('   node 35GdsMRBde.js --add --db OP7');
    console.log('   node 35GdsMRBde.js --del --db OP1');
    console.log('   node 35GdsMRBde.js add OP7                   (legacy format)');
}

// Main execution logic
async function main() {
    const args = process.argv.slice(2);
    
    // Handle no arguments
    if (args.length === 0) {
        console.log('🎖️ 35th Guards Motor Rifle Brigade Database Manager');
        console.log('==================================================\n');
        await listAvailableDatabases();
        return;
    }
    
    try {
        // Check for legacy format: "add <database>" or "remove <database>"
        if (args.length >= 2 && (args[0] === 'add' || args[0] === 'remove')) {
            const command = args[0];
            const database = args[1].toUpperCase();
            
            // Validate database
            if (!DATABASE_CONFIGS[database]) {
                console.error(`❌ Invalid database: ${database}`);
                console.error('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
                console.error('Use --list to see all available databases');
                process.exit(1);
            }
            
            // Initialize and perform operation (legacy format)
            try {
                initializeOperationConfig(database);
            } catch (error) {
                console.error('❌ Initialization failed:', error.message);
                console.log('\n💡 Try running: node 35GdsMRBde.js --diagnostic');
                process.exit(1);
            }
            
            if (command === 'add') {
                await performAddOperation();
            } else {
                await performRemoveOperation();
            }
            return;
        }
        
        // Check for legacy list command
        if (args[0] === 'list') {
            await listAvailableDatabases();
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
            await listAvailableDatabases();
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
            console.log('\n💡 Try running: node 35GdsMRBde.js --diagnostic');
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