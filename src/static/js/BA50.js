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

// Function to clear any cached data that might contain A-50
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

// Function to add A-50 aircraft to the JSON data
function addA50Aircraft() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const aircraftId = `aircraft-a50-awacs-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the A-50 aircraft entry following IES4 schema
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
            },
            {
                "value": "Product 976",
                "identifierType": "DEVELOPMENT_CODE",
                "issuingAuthority": "Beriev"
            },
            {
                "value": "Shmel",
                "identifierType": "NATO_CODE",
                "issuingAuthority": "NATO"
            },
            {
                "value": "Mainstay",
                "identifierType": "NATO_REPORTING_NAME",
                "issuingAuthority": "NATO"
            }
        ],
        "aircraftType": "airborne-early-warning-control",
        "manufacturer": "Beriev Aircraft Company",
        "basedOn": "Ilyushin Il-76MD",
        "model": "A-50",
        "firstFlight": 1978,
        "enteredService": 1984,
        "owner": "Soviet Union/Russian Federation",
        "location": OPERATION_CONFIG.displayName,
        "representations": [
            {
                "id": "a50-wiki",
                "type": "webpage",
                "title": "Beriev A-50 - Wikipedia",
                "description": "Wikipedia article about the Beriev A-50 airborne early warning aircraft",
                "url": "https://en.wikipedia.org/wiki/Beriev_A-50"
            }
        ],
        "temporalParts": [
            {
                "id": "a50-development-start",
                "stateType": "development_started",
                "startTime": "1970-01-01T00:00:00Z",
                "location": "Beriev Design Bureau, Taganrog"
            },
            {
                "id": "a50-first-flight",
                "stateType": "first_flight",
                "startTime": "1978-12-19T00:00:00Z",
                "location": "Taganrog, Soviet Union"
            },
            {
                "id": "a50-service-entry",
                "stateType": "entered_service",
                "startTime": "1984-01-01T00:00:00Z",
                "location": "Soviet Air Force"
            },
            {
                "id": `a50-deployed-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "regional_deployment",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        "states": [
            {
                "id": `a50-operational-${OPERATION_CONFIG.database.toLowerCase()}`,
                "stateType": "active_service",
                "startTime": "2020-01-01T00:00:00Z",
                "location": OPERATION_CONFIG.displayName
            }
        ],
        // Additional aircraft-specific properties
        "specifications": {
            "maxTakeoffWeight": "190,000 kg",
            "length": "46.59 m",
            "wingspan": "50.50 m",
            "height": "14.76 m",
            "crew": 15,
            "classification": "Airborne Early Warning and Control",
            "radarSystem": "Shmel radar complex",
            "engines": "4 × Soloviev D-30KP turbofan",
            "thrustPerEngine": "12,000 kgf",
            "maxSpeed": "800 km/h",
            "cruiseSpeed": "700 km/h",
            "serviceAltitude": "10,000 m",
            "operationalRange": "4,000 km",
            "endurance": "6 hours",
            "detectionRange": "650 km (aircraft)",
            "trackingCapacity": "300 targets",
            "simultaneousInterceptions": "12 aircraft",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "A-50",
            "A-50M",
            "A-50U",
            "A-50EI (export version for India)",
            "KJ-2000 (Chinese development)"
        ],
        "missions": [
            "Airborne Early Warning",
            "Air Traffic Control",
            "Electronic Intelligence",
            "Air Defense Coordination",
            "Strike Mission Coordination"
        ]
    };
    
    // Create aircraft type definition for AEW&C aircraft
    const aewcAircraftType = {
        "id": "airborne-early-warning-control",
        "name": "Airborne Early Warning and Control Aircraft",
        "category": "military aircraft",
        "subcategory": "surveillance aircraft",
        "description": "Airborne early warning and control aircraft designed for air surveillance and command functions",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "airborne_early_warning",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "15",
                "dataType": "number"
            },
            {
                "name": "max_takeoff_weight_kg",
                "value": "190000",
                "dataType": "number"
            },
            {
                "name": "detection_range_km",
                "value": "650",
                "dataType": "number"
            },
            {
                "name": "radar_type",
                "value": "rotating_dome",
                "dataType": "string"
            },
            {
                "name": "engine_count",
                "value": "4",
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
    
    // Check if A-50 already exists (check for any A-50 in this database)
    const existingAircraft = data.aircraft.find(a => 
        a.id.includes('aircraft-a50-awacs') || 
        (a.names && a.names.some(name => 
            name.value === 'A-50' || 
            name.value === 'А-50' ||
            name.value === 'Beriev A-50'
        ))
    );
    
    if (existingAircraft) {
        console.log(`ℹ️ A-50 aircraft already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.aircraft.findIndex(a => a.id === existingAircraft.id);
        data.aircraft[index] = { ...a50Aircraft, id: existingAircraft.id };
    } else {
        // Add the aircraft to the aircraft array
        data.aircraft.push(a50Aircraft);
    }
    
    // Add the aircraft type if it doesn't already exist
    const existingAircraftType = data.aircraftTypes.find(at => at.id === "airborne-early-warning-control");
    if (!existingAircraftType) {
        data.aircraftTypes.push(aewcAircraftType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added A-50 aircraft to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added aircraft ID:', a50Aircraft.id);
    console.log('🏷️ Aircraft type added:', aewcAircraftType.id);
    
    return data;
}

// Function to remove A-50 aircraft from the JSON data
function removeA50Aircraft() {
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
        
        // Remove A-50 from aircraft array
        if (data.aircraft && Array.isArray(data.aircraft)) {
            const initialLength = data.aircraft.length;
            data.aircraft = data.aircraft.filter(aircraft => {
                // Check multiple possible identifiers for the A-50
                const isA50Aircraft = 
                    aircraft.id.includes('aircraft-a50-awacs') ||
                    (aircraft.names && aircraft.names.some(name => 
                        name.value === 'A-50' || 
                        name.value === 'А-50' ||
                        name.value === 'Beriev A-50' ||
                        name.value === 'Shmel' ||
                        name.value === 'Mainstay'
                    )) ||
                    (aircraft.identifiers && aircraft.identifiers.some(id => 
                        id.value === 'A-50' || 
                        id.value === 'Product 976' ||
                        id.value === 'Shmel' ||
                        id.value === 'Mainstay'
                    ));
                
                return !isA50Aircraft;
            });
            
            removedCount = initialLength - data.aircraft.length;
        }
        
        // Check if we should remove the AEW&C aircraft type
        // (only if no other AEW&C aircraft remain)
        if (data.aircraftTypes && Array.isArray(data.aircraftTypes)) {
            const hasOtherAEWCAircraft = data.aircraft && data.aircraft.some(aircraft => 
                aircraft.aircraftType === 'airborne-early-warning-control'
            );
            
            if (!hasOtherAEWCAircraft) {
                const initialTypeLength = data.aircraftTypes.length;
                data.aircraftTypes = data.aircraftTypes.filter(at => 
                    at.id !== 'airborne-early-warning-control'
                );
                removedAircraftType = initialTypeLength > data.aircraftTypes.length;
            }
        }
        
        // Write the updated data back to the file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        // Report results
        if (removedCount > 0) {
            console.log(`✅ Successfully removed ${removedCount} A-50 aircraft record(s) from ${OPERATION_CONFIG.displayName}`);
            if (removedAircraftType) {
                console.log('✅ Also removed airborne-early-warning-control aircraft type (no other AEW&C aircraft found)');
            }
        } else {
            console.log(`ℹ️ No A-50 aircraft records found to remove from ${OPERATION_CONFIG.displayName}`);
        }
        
        return removedCount > 0;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Invalid JSON in file: ${filePath}`);
            console.error('JSON parsing error:', error.message);
        } else {
            console.error('❌ Error removing A-50 aircraft:', error.message);
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
        
        // Check for any remaining A-50 references
        let remainingRefs = 0;
        if (data.aircraft) {
            data.aircraft.forEach(aircraft => {
                if (aircraft.names && aircraft.names.some(name => 
                    name.value.toLowerCase().includes('a-50') || 
                    name.value.toLowerCase().includes('а-50') ||
                    name.value.toLowerCase().includes('beriev a-50') ||
                    name.value.toLowerCase().includes('shmel') ||
                    name.value.toLowerCase().includes('mainstay')
                )) {
                    remainingRefs++;
                    console.log(`   Found A-50 reference: ${aircraft.id}`);
                }
            });
        }
        
        console.log(`   A-50 references found: ${remainingRefs}`);
        
        if (remainingRefs === 0) {
            console.log('✅ No remaining A-50 aircraft references found');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying file structure:', error.message);
        return false;
    }
}

// Main add operation
async function performAddOperation() {
    console.log(`🚀 Adding A-50 aircraft to ${OPERATION_CONFIG.displayName} database...\n`);
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Add aircraft to JSON file
        addA50Aircraft();
        
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
            console.log(`   ✅ A-50 aircraft added to ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with new data');
            console.log('   ✅ Auto-refresh system will detect changes within 5 seconds');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 If you have the Analysis page open with auto-refresh enabled,');
            console.log('    the changes will appear automatically within a few seconds!');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ A-50 aircraft added to ${OPERATION_CONFIG.displayName}`);
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
    console.log(`🚀 Removing A-50 aircraft from ${OPERATION_CONFIG.displayName} database...\n`);
    
    let success = false;
    
    try {
        // Create backup
        backupFile();
        
        // Step 1: Remove aircraft from JSON file
        console.log('🔍 Removing aircraft from JSON file...');
        success = removeA50Aircraft();
        
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
            console.log(`   ✅ A-50 aircraft removed from ${OPERATION_CONFIG.displayName}`);
            console.log('   ✅ Database reloaded in web interface');
            console.log('   ✅ Analysis refreshed with updated data');
            console.log('   ✅ Cache cleared');
            console.log('\n🌐 You can now view the updated data in your web browser');
            console.log('💡 The A-50 aircraft should no longer appear in any analysis');
        } else {
            console.log('\n⚠️ Partial success:');
            console.log(`   ✅ A-50 aircraft removed from ${OPERATION_CONFIG.displayName}`);
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

// Export functions for command line usage
module.exports = {
    initializeOperationConfig,
    performAddOperation,
    performRemoveOperation,
    listAvailableDatabases,
    addA50Aircraft,
    removeA50Aircraft,
    verifyFileStructure
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🛩️ Beriev A-50 Aircraft Database Management Tool');
        console.log('===============================================\n');
        console.log('Usage: node BA50.js [command] [database]\n');
        console.log('Commands:');
        console.log('  add [database]     - Add A-50 aircraft to specified database');
        console.log('  remove [database]  - Remove A-50 aircraft from specified database');
        console.log('  list              - List available databases');
        console.log('\nDatabases: OP1, OP2, OP3, OP4, OP5, OP6, OP7');
        console.log('\nExamples:');
        console.log('  node BA50.js add OP7      - Add A-50 to Odesa Oblast database');
        console.log('  node BA50.js remove OP1   - Remove A-50 from Kyiv Oblast database');
        console.log('  node BA50.js list         - Show all available databases');
        process.exit(0);
    }
    
    const command = args[0].toLowerCase();
    const database = args[1] ? args[1].toUpperCase() : 'OP7';
    
    // Validate database
    if (command !== 'list' && !DATABASE_CONFIGS[database]) {
        console.error(`❌ Invalid database: ${database}`);
        console.error('Available databases:', Object.keys(DATABASE_CONFIGS).join(', '));
        process.exit(1);
    }
    
    // Initialize configuration if not listing
    if (command !== 'list') {
        initializeOperationConfig(database);
    }
    
    // Execute command
    switch (command) {
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
            console.error(`❌ Unknown command: ${command}`);
            console.error('Available commands: add, remove, list');
            process.exit(1);
    }
}