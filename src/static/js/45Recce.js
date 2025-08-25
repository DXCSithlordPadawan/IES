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
    console.log('🎖️ 45th Detached Reconnaissance Regiment Database Management Tool');
    console.log('================================================================\n');
    console.log('Usage: node 45Recce.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add 45th DRR unit to specified database');
    console.log('  --del              Remove 45th DRR unit from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node 45Recce.js --add --db OP7     Add 45th DRR to Odesa Oblast database');
    console.log('  node 45Recce.js --del --db OP1     Remove 45th DRR from Donetsk Oblast database');
    console.log('  node 45Recce.js --list             Show all available databases');
    console.log('  node 45Recce.js --diagnostic       Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running 45Recce.js Diagnostic Checks');
    console.log('=======================================\n');
    
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

// Function to clear any cached data that might contain 45th DRR
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

// Function to add 45th DRR unit to the JSON data
function add45thDRRUnit() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const unitId = `unit-45drr-reconnaissance-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the 45th DRR unit entry following IES4 schema
    const drrUnit = {
        "id": unitId,
        "uri": "https://en.wikipedia.org/wiki/45th_Detached_Reconnaissance_Regiment",
        "type": "MilitaryUnit",
        "names": [
            {
                "value": "45th Detached Reconnaissance Regiment",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "45-й окремий розвідувальний полк",
                "language": "uk",
                "nameType": "official"
            },
            {
                "value": "45th DRR",
                "language": "en",
                "nameType": "abbreviation"
            }
        ],
        "identifiers": [
            {
                "value": "45th DRR",
                "identifierType": "UNIT_DESIGNATION",
                "issuingAuthority": "Ukrainian Armed Forces"
            },
            {
                "value": "в/ч А1546",
                "identifierType": "MILITARY_UNIT_NUMBER",
                "issuingAuthority": "Ukrainian Armed Forces"
            }
        ],
        "unitType": "reconnaissance-regiment",
        "branch": "Ukrainian Armed Forces",
        "status": "active",
        "established": 1994,
        "location": OPERATION_CONFIG.displayName,
        "country": "Ukraine",
        "representations": [
            {
                "id": "45drr-wiki",
                "type": "webpage",
                "title": "45th Detached Reconnaissance Regiment - Wikipedia",
                "description": "Wikipedia article about the 45th Detached Reconnaissance Regiment",
                "url": "https://en.wikipedia.org/wiki/45th_Detached_Reconnaissance_Regiment"
            }
        ],
        "temporalParts": [
            {
                "id": "45drr-formation",
                "stateType": "unit_established",
                "startTime": "1994-01-01T00:00:00Z",
                "location": "Ukraine"
            },
            {
                "id": "45drr-modernization",
                "stateType": "unit_modernized",
                "startTime": "2014-01-01T00:00:00Z",
                "location": "Ukraine"
            },
            {
                "id": `45drr-deployment-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `45drr-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional unit-specific properties
        "specifications": {
            "unitSize": "Regiment",
            "personnelStrength": "800-1200",
            "primaryRole": "Special reconnaissance",
            "secondaryRoles": [
                "Intelligence gathering",
                "Surveillance operations",
                "Target designation",
                "Deep reconnaissance"
            ],
            "equipment": [
                "Reconnaissance vehicles",
                "Communications equipment",
                "Surveillance systems",
                "Small arms",
                "Night vision equipment"
            ],
            "operationalRegion": OPERATION_CONFIG.displayName,
            "subordination": "Ukrainian Armed Forces"
        },
        "capabilities": [
            "deep reconnaissance",
            "intelligence gathering",
            "surveillance operations",
            "target designation",
            "special operations support",
            "electronic warfare reconnaissance"
        ],
        "specializations": [
            "tactical reconnaissance",
            "strategic reconnaissance",
            "electronic intelligence",
            "signals intelligence",
            "battlefield surveillance"
        ]
    };
    
    // Create unit type definition for reconnaissance regiments
    const reconnaissanceRegimentType = {
        "id": "reconnaissance-regiment",
        "name": "Reconnaissance Regiment",
        "category": "military unit",
        "subcategory": "reconnaissance",
        "description": "Specialized military unit conducting reconnaissance and intelligence operations",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "reconnaissance",
                "dataType": "string"
            },
            {
                "name": "unit_size",
                "value": "regiment",
                "dataType": "string"
            },
            {
                "name": "personnel_strength",
                "value": "800-1200",
                "dataType": "string"
            },
            {
                "name": "specialization",
                "value": "intelligence_gathering",
                "dataType": "string"
            },
            {
                "name": "mobility",
                "value": "high",
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
    
    // Check if 45th DRR already exists
    const existingUnit = data.militaryUnits.find(u => 
        u.id.includes('unit-45drr-reconnaissance') || 
        (u.names && u.names.some(name => 
            name.value.includes('45th Detached Reconnaissance Regiment') || 
            name.value.includes('45-й окремий розвідувальний полк') ||
            name.value === '45th DRR'
        ))
    );
    
    if (existingUnit) {
        console.log(`ℹ️ 45th DRR unit already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.militaryUnits.findIndex(u => u.id === existingUnit.id);
        data.militaryUnits[index] = { ...drrUnit, id: existingUnit.id };
    } else {
        // Add the unit to the militaryUnits array
        data.militaryUnits.push(drrUnit);
    }
    
    // Add the unit type if it doesn't already exist
    const existingUnitType = data.unitTypes.find(ut => ut.id === "reconnaissance-regiment");
    if (!existingUnitType) {
        data.unitTypes.push(reconnaissanceRegimentType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added 45th DRR unit to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added unit ID:', drrUnit.id);
    console.log('🏷️ Unit type added:', reconnaissanceRegimentType.id);
    
    return data;
}

// Function to remove 45th DRR unit from the JSON data
function remove45thDRRUnit() {
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
        
        // Remove 45th DRR from militaryUnits array
        if (data.militaryUnits && Array.isArray(data.militaryUnits)) {
            const initialLength = data.militaryUnits.length;
            data.militaryUnits = data.militaryUnits.filter(unit => {
                // Check multiple possible identifiers for the 45th DRR
                const is45thDRRUnit = 
                    unit.id.includes('unit-45drr-reconnaissance') ||
                    (unit.names && unit.names.some(name => 
                        name.value.includes('45th Detached Reconnaissance Regiment') || 
                        name.value.includes('45-й окремий розвідувальний полк') ||
                        name.value === '45th DRR'
                    )) ||
                    (unit.identifiers && unit.identifiers.some(id => 
                        id.value === '45th DRR' || 
                        id.value === 'в/ч А1546'
                    ));
                
                return !is45thDRRUnit;
            });
            
            removedCount = initialLength - data.militaryUnits.length;
        }
        
        // Check if we should remove the reconnaissance regiment type
        // (only if no other reconnaissance regiments remain)
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
            const hasOtherReconRegiments = data.militaryUnits && data.militaryUnits.some(unit => 
                unit.unitType === 'reconnaissance-regiment'
            );
            
            if (!hasOtherReconRegiments) {
                const initialTypeLength = data.unitTypes.length;
                data.unitTypes = data.unitTypes.filter(ut => 
                    ut.id !== 'reconnaissance-regiment'
                );
                removedUnitType = initialTypeLength > data.unitTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} 45th DRR unit record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedUnitType) {
                console.log('✅ Also removed reconnaissance-regiment unit type (no other reconnaissance regiments found)');
            }
        } else {
            console.log(`ℹ️ No 45th DRR unit records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing 45th DRR unit:', error.message);
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
        
        // Check for any remaining 45th DRR references
        let remainingRefs = 0;
        if (data.militaryUnits) {
            data.militaryUnits.forEach(unit => {
                if (unit.names && unit.names.some(name => 
                    name.value.includes('45th Detached Reconnaissance Regiment') || 
                    name.value.includes('45-й окремий розвідувальний полк') ||
                    name.value === '45th DRR'
                )) {
                    remainingRefs++;
                    console.log(`   Found 45th DRR reference: ${unit.id}`);
                }
            });
        }
        
        console.log(`   45th DRR references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining 45th DRR unit references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding 45th DRR unit to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add unit to JSON file
        add45thDRRUnit();
        
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
            console.log(`   ✅ 45th DRR unit added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 45th DRR unit added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing 45th DRR unit from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove unit from JSON file
        console.log('🔍 Removing unit from JSON file...');
        success = remove45thDRRUnit();
        
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
            console.log(`   ✅ 45th DRR unit removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The 45th DRR unit should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ 45th DRR unit removed from ${OPERATION_CONFIG.displayName}`);
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
            console.log('\n💡 Try running: node 45Recce.js --diagnostic');
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
    add45thDRRUnit,
    remove45thDRRUnit,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    verifyFileStructure
};