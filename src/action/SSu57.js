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

// Function to clear any cached data that might contain Su-57
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

// Function to add Su-57 aircraft to the JSON data
function addSu57Aircraft() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const aircraftId = `aircraft-su57-fighter-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the Su-57 aircraft entry following IES4 schema
    const su57Aircraft = {
        "id": aircraftId,
        "uri": "https://en.wikipedia.org/wiki/Sukhoi_Su-57",
        "type": "Aircraft",
        "names": [
            {
                "value": "Su-57",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "Су-57",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Felon",
                "language": "en",
                "nameType": "nato_designation"
            }
        ],
        "identifiers": [
            {
                "value": "Su-57",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Sukhoi"
            },
            {
                "value": "T-50",
                "identifierType": "PROTOTYPE_DESIGNATION",
                "issuingAuthority": "Sukhoi"
            },
            {
                "value": "PAK FA",
                "identifierType": "PROGRAM_NAME",
                "issuingAuthority": "Russian Air Force"
            },
            {
                "value": "Felon",
                "identifierType": "NATO_DESIGNATION",
                "issuingAuthority": "NATO"
            }
        ],
        "aircraftType": "fifth-generation-fighter",
        "manufacturer": "Sukhoi",
        "model": "Su-57",
        "firstFlight": 2010,
        "enteredService": 2020,
        "operator": "Russian Air Force",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "su57-wiki",
                "type": "webpage",
                "title": "Sukhoi Su-57 - Wikipedia",
                "description": "Wikipedia article about the Sukhoi Su-57 fifth-generation fighter aircraft",
                "url": "https://en.wikipedia.org/wiki/Sukhoi_Su-57"
            }
        ],
        "temporalParts": [
            {
                "id": "su57-program-start",
                "stateType": "program_initiated",
                "startTime": "2002-01-01T00:00:00Z",
                "location": "Moscow, Russia"
            },
            {
                "id": "su57-first-flight",
                "stateType": "first_flight",
                "startTime": "2010-01-29T00:00:00Z",
                "location": "Zhukovsky Airfield, Russia"
            },
            {
                "id": "su57-production-start",
                "stateType": "production_started",
                "startTime": "2019-01-01T00:00:00Z",
                "location": "Komsomolsk-on-Amur, Russia"
            },
            {
                "id": "su57-service-entry",
                "stateType": "entered_service",
                "startTime": "2020-12-25T00:00:00Z",
                "location": "Russian Air Force"
            },
            {
                "id": `su57-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `su57-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2022-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional aircraft-specific properties
        "specifications": {
            "length": "19.8 m",
            "wingspan": "14.0 m",
            "height": "4.74 m",
            "emptyWeight": "18,500 kg",
            "maxTakeoffWeight": "35,000 kg",
            "crew": 1,
            "classification": "Fifth-generation fighter aircraft",
            "engines": "2 × Saturn AL-41F1 afterburning turbofans",
            "maxSpeed": "Mach 2.0 (2,100 km/h)",
            "combatRange": "3,500 km",
            "serviceceiling": "20,000 m",
            "armament": "1 × 30 mm GSh-30-1 autocannon, various missiles and bombs",
            "avionics": "AESA radar, stealth technology",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "T-50 (prototype)",
            "Su-57 (production)",
            "Su-57M (planned upgrade)"
        ],
        "capabilities": [
            "air-to-air combat",
            "air-to-ground strikes",
            "stealth technology",
            "supercruise",
            "advanced avionics",
            "multirole operations"
        ]
    };
    
    // Create aircraft type definition for fifth-generation fighters
    const fifthGenFighterType = {
        "id": "fifth-generation-fighter",
        "name": "Fifth Generation Fighter",
        "category": "military aircraft",
        "subcategory": "fighter aircraft",
        "description": "Advanced stealth multirole fighter aircraft with supercruise capability",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "multirole fighter",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "1",
                "dataType": "number"
            },
            {
                "name": "generation",
                "value": "5",
                "dataType": "number"
            },
            {
                "name": "stealth_capable",
                "value": "true",
                "dataType": "boolean"
            },
            {
                "name": "supercruise_capable",
                "value": "true",
                "dataType": "boolean"
            },
            {
                "name": "max_speed_mach",
                "value": "2.0",
                "dataType": "number"
            }
        ]
    };
    
    // Add aircraft array if it doesn't exist
    if (!data.aircraft) {
        data.aircraft = [];
    }
    
    // Add aircraftTypes array if it doesn't exist
    if (!data.aircraftTypes) {
        data.aircraftTypes = [];
    }
    
    // Check if Su-57 already exists (check for any Su-57 in this database)
    const existingAircraft = data.aircraft.find(a => 
        a.id.includes('aircraft-su57-fighter') || 
        (a.names && a.names.some(name => 
            name.value === 'Su-57' || 
            name.value === 'Су-57' ||
            name.value === 'Felon'
        ))
    );
    
    if (existingAircraft) {
        console.log(`ℹ️ Su-57 aircraft already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.aircraft.findIndex(a => a.id === existingAircraft.id);
        data.aircraft[index] = { ...su57Aircraft, id: existingAircraft.id };
    } else {
        // Add the aircraft to the aircraft array
        data.aircraft.push(su57Aircraft);
    }
    
    // Add the aircraft type if it doesn't already exist
    const existingAircraftType = data.aircraftTypes.find(at => at.id === "fifth-generation-fighter");
    if (!existingAircraftType) {
        data.aircraftTypes.push(fifthGenFighterType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added Su-57 aircraft to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added aircraft ID:', su57Aircraft.id);
    console.log('🏷️ Aircraft type added:', fifthGenFighterType.id);
    
    return data;
}

// Function to remove Su-57 aircraft from the JSON data
function removeSu57Aircraft() {
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
        let removedAircraftType = false;
        
        // Remove Su-57 from aircraft array
        if (data.aircraft && Array.isArray(data.aircraft)) {
            const initialLength = data.aircraft.length;
            data.aircraft = data.aircraft.filter(aircraft => {
                // Check multiple possible identifiers for the Su-57
                const isSu57Aircraft = 
                    aircraft.id.includes('aircraft-su57-fighter') ||
                    (aircraft.names && aircraft.names.some(name => 
                        name.value === 'Su-57' || 
                        name.value === 'Су-57' ||
                        name.value === 'Felon'
                    )) ||
                    (aircraft.identifiers && aircraft.identifiers.some(id => 
                        id.value === 'Su-57' || 
                        id.value === 'T-50' ||
                        id.value === 'PAK FA' ||
                        id.value === 'Felon'
                    ));
                
                return !isSu57Aircraft;
            });
            
            removedCount = initialLength - data.aircraft.length;
        }
        
        // Check if we should remove the fifth generation fighter type
        // (only if no other fifth generation fighters remain)
        if (data.aircraftTypes && Array.isArray(data.aircraftTypes)) {
            const hasOtherFifthGenFighters = data.aircraft && data.aircraft.some(aircraft => 
                aircraft.aircraftType === 'fifth-generation-fighter'
            );
            
            if (!hasOtherFifthGenFighters) {
                const initialTypeLength = data.aircraftTypes.length;
                data.aircraftTypes = data.aircraftTypes.filter(at => 
                    at.id !== 'fifth-generation-fighter'
                );
                removedAircraftType = initialTypeLength > data.aircraftTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} Su-57 aircraft record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedAircraftType) {
                console.log('✅ Also removed fifth-generation-fighter aircraft type (no other fifth gen fighters found)');
            }
        } else {
            console.log(`ℹ️ No Su-57 aircraft records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing Su-57 aircraft:', error.message);
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
        console.log(`   Aircraft: ${data.aircraft ? data.aircraft.length : 0}`);
        console.log(`   Aircraft Types: ${data.aircraftTypes ? data.aircraftTypes.length : 0}`);
        
        // Check for any remaining Su-57 references
        let remainingRefs = 0;
        if (data.aircraft) {
            data.aircraft.forEach(aircraft => {
                if (aircraft.names && aircraft.names.some(name => 
                    name.value.toLowerCase().includes('su-57') || 
                    name.value.toLowerCase().includes('су-57') ||
                    name.value.toLowerCase().includes('felon')
                )) {
                    remainingRefs++;
                    console.log(`   Found Su-57 reference: ${aircraft.id}`);
                }
            });
        }
        
        console.log(`   Su-57 references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining Su-57 aircraft references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding Su-57 aircraft to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add aircraft to JSON file
        addSu57Aircraft();
        
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
            console.log(`   ✅ Su-57 aircraft added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Su-57 aircraft added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing Su-57 aircraft from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove aircraft from JSON file
        console.log('🔍 Removing aircraft from JSON file...');
        success = removeSu57Aircraft();
        
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
            console.log(`   ✅ Su-57 aircraft removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The Su-57 aircraft should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ Su-57 aircraft removed from ${OPERATION_CONFIG.displayName}`);
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

// Main execution
async function main() {
    console.log('✈️ Sukhoi Su-57 Database Management Tool');
    console.log('=====================================\n');
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node SSu57.js <database> <operation>');
        console.log('');
        console.log('Operations:');
        console.log('  add    - Add Su-57 aircraft to the specified database');
        console.log('  remove - Remove Su-57 aircraft from the specified database');
        console.log('  list   - List available databases');
        console.log('');
        console.log('Examples:');
        console.log('  node SSu57.js OP7 add');
        console.log('  node SSu57.js OP1 remove');
        console.log('  node SSu57.js list list');
        return;
    }
    
    const [database, operation] = args;
    
    if (operation === 'list') {
        await listAvailableDatabases();
        return;
    }
    
    // Initialize operation configuration
    initializeOperationConfig(database);
    
    // Execute the requested operation
    switch (operation.toLowerCase()) {
        case 'add':
            await performAddOperation();
            break;
        case 'remove':
            await performRemoveOperation();
            break;
        default:
            console.error(`❌ Unknown operation: ${operation}`);
            console.log('Available operations: add, remove, list');
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    });
}

// Export functions for potential module use
module.exports = {
    initializeOperationConfig,
    addSu57Aircraft,
    removeSu57Aircraft,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    verifyFileStructure
};