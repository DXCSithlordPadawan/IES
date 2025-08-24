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
    console.log('🚗 1st Heavy Mechanized Brigade Database Management Tool');
    console.log('========================================================\n');
    console.log('Usage: node 1HvMecBde.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add 1st Heavy Mechanized Brigade to specified database');
    console.log('  --del              Remove 1st Heavy Mechanized Brigade from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Alternative Usage (Legacy Format):');
    console.log('  add <database>     Add 1st Heavy Mechanized Brigade to specified database');
    console.log('  remove <database>  Remove 1st Heavy Mechanized Brigade from specified database\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node 1HvMecBde.js --add --db OP7      Add 1st Heavy Mechanized Brigade to Odesa Oblast database');
    console.log('  node 1HvMecBde.js --del --db OP1      Remove 1st Heavy Mechanized Brigade from Donetsk Oblast database');
    console.log('  node 1HvMecBde.js add OP7             Add 1st Heavy Mechanized Brigade to Odesa Oblast (legacy)');
    console.log('  node 1HvMecBde.js --list              Show all available databases');
    console.log('  node 1HvMecBde.js --diagnostic        Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running 1HvMecBde.js Diagnostic Checks');
    console.log('==========================================\n');
    
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
                console.log(`       Vehicles count: ${data.vehicles ? data.vehicles.length : 0}`);
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
                console.log(`📈 Contains ${data.vehicles ? data.vehicles.length : 0} vehicle entries`);
                
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

// Function to clear any cached data that might contain 1st Heavy Mechanized Brigade
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

// Function to add 1st Heavy Mechanized Brigade to the JSON data
function add1stHeavyMechanizedBrigade() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const brigadeId = `unit-1st-heavy-mechanized-brigade-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the 1st Heavy Mechanized Brigade entry following IES4 schema
    const heavyMechanizedBrigade = {
        "id": brigadeId,
        "uri": "https://en.wikipedia.org/wiki/1st_Heavy_Mechanized_Brigade",
        "type": "MilitaryUnit",
        "names": [
            {
                "value": "1st Heavy Mechanized Brigade",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "1-ша важка механізована бригада",
                "language": "uk",
                "nameType": "official"
            }
        ],
        "identifiers": [
            {
                "value": "1st Heavy Mechanized Brigade",
                "identifierType": "UNIT_DESIGNATION",
                "issuingAuthority": "Ukrainian Armed Forces"
            },
            {
                "value": "A4137",
                "identifierType": "MILITARY_UNIT_NUMBER",
                "issuingAuthority": "Ukrainian Armed Forces"
            }
        ],
        "unitType": "heavy-mechanized-brigade",
        "branch": "Ukrainian Ground Forces",
        "size": "brigade",
        "parentUnit": "Ukrainian Ground Forces",
        "location": OPERATION_CONFIG.displayName,
        "operationalRegion": "Ukraine",
        "representations": [
            {
                "id": "1st-heavy-mech-wiki",
                "type": "webpage",
                "title": "1st Heavy Mechanized Brigade - Wikipedia",
                "description": "Wikipedia article about the 1st Heavy Mechanized Brigade of Ukraine",
                "url": "https://en.wikipedia.org/wiki/1st_Heavy_Mechanized_Brigade"
            }
        ],
        "temporalParts": [
            {
                "id": "1st-heavy-mech-formation",
                "stateType": "unit_formation",
                "startTime": "2016-01-01T00:00:00Z",
                "location": "Ukraine"
            },
            {
                "id": "1st-heavy-mech-restructure",
                "stateType": "unit_restructured",
                "startTime": "2022-01-01T00:00:00Z",
                "location": "Ukraine"
            },
            {
                "id": "1st-heavy-mech-combat-ready",
                "stateType": "combat_ready",
                "startTime": "2023-01-01T00:00:00Z",
                "location": "Ukraine"
            },
            {
                "id": `1st-heavy-mech-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2023-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `1st-heavy-mech-active-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2016-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional brigade-specific properties
        "specifications": {
            "unitSize": "Brigade (~3,000-5,000 personnel)",
            "classification": "Heavy Mechanized Brigade",
            "primaryRole": "Heavy mechanized operations",
            "formation": "2016",
            "restructured": "2022",
            "combatReady": "2023",
            "mainEquipment": [
                "Leopard 2A6 main battle tanks",
                "M2A2 Bradley infantry fighting vehicles",
                "Self-propelled artillery",
                "Anti-tank systems"
            ],
            "deploymentRegion": OPERATION_CONFIG.displayName,
            "operationalStatus": "Active",
            "commandStructure": "Ukrainian Ground Forces"
        },
        "capabilities": [
            "Heavy armor operations",
            "Combined arms warfare",
            "Mechanized assault",
            "Defensive operations",
            "NATO interoperability"
        ],
        "equipment": {
            "mainBattleTanks": "Leopard 2A6",
            "infantryFightingVehicles": "M2A2 Bradley",
            "artillery": "Self-propelled howitzers",
            "antiTankSystems": "Javelin, NLAW",
            "airDefense": "Portable air defense systems"
        }
    };
    
    // Create unit type definition for heavy mechanized brigades
    const heavyMechanizedBrigadeType = {
        "id": "heavy-mechanized-brigade",
        "name": "Heavy Mechanized Brigade",
        "category": "military unit",
        "subcategory": "brigade",
        "description": "Heavy mechanized brigade equipped with main battle tanks and mechanized infantry",
        "characteristics": [
            {
                "name": "unit_type",
                "value": "heavy mechanized brigade",
                "dataType": "string"
            },
            {
                "name": "personnel_size",
                "value": "3000-5000",
                "dataType": "string"
            },
            {
                "name": "primary_equipment",
                "value": "main_battle_tanks",
                "dataType": "string"
            },
            {
                "name": "operational_role",
                "value": "heavy_mechanized_operations",
                "dataType": "string"
            },
            {
                "name": "command_level",
                "value": "brigade",
                "dataType": "string"
            }
        ]
    };
    
    // Add militaryUnits array if it doesn't exist
    if (!data.militaryUnits) {
        data.militaryUnits = [];
    }
    
    // Add unitTypes array if it doesn't exist
    if (!data.unitTypes) {
        data.unitTypes = [];
    }
    
    // Check if 1st Heavy Mechanized Brigade already exists
    const existingBrigade = data.militaryUnits.find(u => 
        u.id.includes('unit-1st-heavy-mechanized-brigade') || 
        (u.names && u.names.some(name => 
            name.value === '1st Heavy Mechanized Brigade' || 
            name.value === '1-ша важка механізована бригада'
        ))
    );
    
    if (existingBrigade) {
        console.log(`ℹ️ 1st Heavy Mechanized Brigade already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.militaryUnits.findIndex(u => u.id === existingBrigade.id);
        data.militaryUnits[index] = { ...heavyMechanizedBrigade, id: existingBrigade.id };
    } else {
        // Add the brigade to the militaryUnits array
        data.militaryUnits.push(heavyMechanizedBrigade);
    }
    
    // Add the unit type if it doesn't already exist
    const existingUnitType = data.unitTypes.find(ut => ut.id === "heavy-mechanized-brigade");
    if (!existingUnitType) {
        data.unitTypes.push(heavyMechanizedBrigadeType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added 1st Heavy Mechanized Brigade to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added unit ID:', heavyMechanizedBrigade.id);
    console.log('🏷️ Unit type added:', heavyMechanizedBrigadeType.id);
    
    return data;
}

// Function to remove 1st Heavy Mechanized Brigade from the JSON data
function remove1stHeavyMechanizedBrigade() {
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
        let removedUnitType = false;
        
        // Remove 1st Heavy Mechanized Brigade from militaryUnits array
        if (data.militaryUnits && Array.isArray(data.militaryUnits)) {
            const initialLength = data.militaryUnits.length;
            data.militaryUnits = data.militaryUnits.filter(unit => {
                // Check multiple possible identifiers for the 1st Heavy Mechanized Brigade
                const is1stHeavyMechBrigade = 
                    unit.id.includes('unit-1st-heavy-mechanized-brigade') ||
                    (unit.names && unit.names.some(name => 
                        name.value === '1st Heavy Mechanized Brigade' || 
                        name.value === '1-ша важка механізована бригада'
                    )) ||
                    (unit.identifiers && unit.identifiers.some(id => 
                        id.value === '1st Heavy Mechanized Brigade' || 
                        id.value === 'A4137'
                    ));
                
                return !is1stHeavyMechBrigade;
            });
            
            removedCount = initialLength - data.militaryUnits.length;
        }
        
        // Check if we should remove the heavy mechanized brigade type
        // (only if no other heavy mechanized brigades remain)
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
            const hasOtherHeavyMechBrigades = data.militaryUnits && data.militaryUnits.some(unit => 
                unit.unitType === 'heavy-mechanized-brigade'
            );
            
            if (!hasOtherHeavyMechBrigades) {
                const initialTypeLength = data.unitTypes.length;
                data.unitTypes = data.unitTypes.filter(ut => 
                    ut.id !== 'heavy-mechanized-brigade'
                );
                removedUnitType = initialTypeLength > data.unitTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} 1st Heavy Mechanized Brigade record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedUnitType) {
                console.log('✅ Also removed heavy-mechanized-brigade unit type (no other heavy mechanized brigades found)');
            }
        } else {
            console.log(`ℹ️ No 1st Heavy Mechanized Brigade records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing 1st Heavy Mechanized Brigade:', error.message);
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
        console.log(`   Military Units: ${data.militaryUnits ? data.militaryUnits.length : 0}`);
        console.log(`   Unit Types: ${data.unitTypes ? data.unitTypes.length : 0}`);
        
        // Check for any remaining 1st Heavy Mechanized Brigade references
        let remainingRefs = 0;
        if (data.militaryUnits) {
            data.militaryUnits.forEach(unit => {
                if (unit.names && unit.names.some(name => 
                    name.value.toLowerCase().includes('1st heavy mechanized brigade') || 
                    name.value.toLowerCase().includes('1-ша важка механізована бригада')
                )) {
                    remainingRefs++;
                    console.log(`   Found 1st Heavy Mechanized Brigade reference: ${unit.id}`);
                }
            });
        }
        
        console.log(`   1st Heavy Mechanized Brigade references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining 1st Heavy Mechanized Brigade references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding 1st Heavy Mechanized Brigade to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add brigade to JSON file
        add1stHeavyMechanizedBrigade();
        
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
            console.log(`   ✅ 1st Heavy Mechanized Brigade added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 1st Heavy Mechanized Brigade added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing 1st Heavy Mechanized Brigade from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove brigade from JSON file
        console.log('🔍 Removing brigade from JSON file...');
        success = remove1stHeavyMechanizedBrigade();
        
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
            console.log(`   ✅ 1st Heavy Mechanized Brigade removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The 1st Heavy Mechanized Brigade should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 1st Heavy Mechanized Brigade removed from ${OPERATION_CONFIG.displayName}`);
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
                console.log(`       📊 Size: ${(stats.size / 1024).toFixed(2)} KB, Vehicles: ${data.vehicles ? data.vehicles.length : 0}`);
            } catch (error) {
                console.log(`       ❌ Error reading: ${error.message}`);
            }
        }
    });
}

// Export main functions for use
module.exports = {
    initializeOperationConfig,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    add1stHeavyMechanizedBrigade,
    remove1stHeavyMechanizedBrigade,
    checkWebInterface,
    reloadDatabase,
    refreshCurrentQuery
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
            console.log('\n💡 Try running: node 1HvMecBde.js --diagnostic');
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