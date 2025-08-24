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
    console.log('🛩️ Beriev A-50 Aircraft Database Management Tool');
    console.log('===============================================\n');
    console.log('Usage: node BA50.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add A-50 aircraft to specified database');
    console.log('  --del              Remove A-50 aircraft from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node BA50.js --add --db OP7      Add A-50 to Odesa Oblast database');
    console.log('  node BA50.js --del --db OP1      Remove A-50 from Kyiv Oblast database');
    console.log('  node BA50.js --list              Show all available databases');
    console.log('  node BA50.js --diagnostic        Run system diagnostics');
}

// Function to run comprehensive diagnostics
function runDiagnostics() {
    console.log('🔧 Running BA50.js Diagnostic Checks');
    console.log('=====================================\n');
    
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

// Enhanced file operations with better error handling and path detection
function addA50Aircraft() {
    const dataDir = findDataDirectory();
    const filePath = path.join(dataDir, OPERATION_CONFIG.dataFile);
    
    console.log(`\n🔧 Adding A-50 aircraft to file: ${filePath}`);
    
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
    const aircraftId = `aircraft-a50-awacs-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    console.log(`🆔 Generated aircraft ID: ${aircraftId}`);
    
    // Create the A-50 aircraft entry (same as before)
    const a50Aircraft = {
        "id": aircraftId,
        "uri": "https://en.wikipedia.org/wiki/Beriev_A-50",
        "type": "Aircraft",
        "names": [
            {
                "value": "A-50",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Beriev A-50",
                "language": "en",
                "nameType": "full_designation"
            },
            {
                "value": "А-50",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Shmel",
                "language": "en",
                "nameType": "nato_code"
            },
            {
                "value": "Mainstay",
                "language": "en",
                "nameType": "nato_reporting"
            }
        ],
        "identifiers": [
            {
                "value": "A-50",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Soviet Union"
            }
        ],
        "aircraftType": "airborne-early-warning-control",
        "manufacturer": "Beriev Aircraft Company",
        "basedOn": "Ilyushin Il-76MD",
        "model": "A-50",
        "firstFlight": 1978,
        "enteredService": 1984,
        "owner": "Soviet Union/Russian Federation",
        "location": OPERATION_CONFIG.displayName
    };
    
    // Add aircraft array if it doesn't exist
    if (!data.aircraft) {
        console.log('📋 Creating aircraft array...');
        data.aircraft = [];
    }
    
    // Check if A-50 already exists
    const existingAircraft = data.aircraft.find(a => 
        a.id.includes('aircraft-a50-awacs') || 
        (a.names && a.names.some(name => 
            name.value === 'A-50' || 
            name.value === 'А-50' ||
            name.value === 'Beriev A-50'
        ))
    );
    
    if (existingAircraft) {
        console.log(`ℹ️ A-50 aircraft already exists. Updating...`);
        const index = data.aircraft.findIndex(a => a.id === existingAircraft.id);
        data.aircraft[index] = { ...a50Aircraft, id: existingAircraft.id };
    } else {
        console.log('➕ Adding new A-50 aircraft...');
        data.aircraft.push(a50Aircraft);
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
        console.log(`✅ Verification: File contains ${verifyData.aircraft ? verifyData.aircraft.length : 0} aircraft entries`);
        
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
    
    console.log(`✅ Successfully added A-50 aircraft to ${OPERATION_CONFIG.displayName}`);
    return data;
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

// Simple test add operation
async function performTestAddOperation() {
    console.log(`🧪 TEST: Adding A-50 aircraft to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        addA50Aircraft();
        console.log('\n🎉 TEST ADD OPERATION COMPLETED SUCCESSFULLY!');
        return true;
    } catch (error) {
        console.error('\n❌ TEST ADD OPERATION FAILED:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        return false;
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
            console.log('\n💡 Try running: node BA50.js --diagnostic');
            process.exit(1);
        }
        
        // Execute command
        switch (parsedArgs.command) {
            case 'add':
                performTestAddOperation();
                break;
            case 'remove':
                console.log('🚧 Remove operation - use diagnostic version for testing file access first');
                console.log('💡 Run: node BA50.js --diagnostic');
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