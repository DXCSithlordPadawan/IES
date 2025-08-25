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

// Function to display help information
function displayHelp() {
    console.log('🚀 BM-21 Grad Multiple Rocket Launcher Database Management Tool');
    console.log('=============================================================\n');
    console.log('Usage: node BM21.js [command] [options]\n');
    console.log('Commands:');
    console.log('  --add              Add BM-21 Grad systems to specified database');
    console.log('  --del              Remove BM-21 Grad systems from specified database');
    console.log('  --list             List available databases');
    console.log('  --diagnostic       Run diagnostic checks');
    console.log('  --help, -h         Show this help message\n');
    console.log('Options:');
    console.log('  --db [database]    Specify database (OP1-OP8, default: OP7)\n');
    console.log('Available Databases: OP1, OP2, OP3, OP4, OP5, OP6, OP7, OP8\n');
    console.log('Examples:');
    console.log('  node BM21.js --add --db OP7     Add BM-21 to Odesa Oblast database');
    console.log('  node BM21.js --del --db OP1     Remove BM-21 from Donetsk Oblast database');
    console.log('  node BM21.js --list             Show all available databases');
    console.log('  node BM21.js --diagnostic       Run system diagnostics');
}

// Function to add BM-21 Grad systems to the JSON data
function addBM21Grad() {
    // Define the file path
    const filePath = path.join('C:', 'ies4-military-database-analysis', 'data', OPERATION_CONFIG.dataFile);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the existing JSON file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Generate unique ID based on database
    const rocketSystemId = `artillery-bm21-grad-${OPERATION_CONFIG.database.toLowerCase()}-001`;
    
    // Create the BM-21 Grad entry following IES4 schema
    const bm21Grad = {
        "id": rocketSystemId,
        "uri": "https://en.wikipedia.org/wiki/BM-21_Grad",
        "type": "Artillery",
        "names": [
            {
                "value": "BM-21 Grad",
                "language": "en",
                "nameType": "official"
            },
            {
                "value": "БМ-21 \"Град\"",
                "language": "ru",
                "nameType": "official"
            },
            {
                "value": "Katyusha",
                "language": "en",
                "nameType": "colloquial"
            },
            {
                "value": "122mm MLRS",
                "language": "en",
                "nameType": "technical"
            }
        ],
        "identifiers": [
            {
                "value": "BM-21",
                "identifierType": "MODEL_DESIGNATION",
                "issuingAuthority": "Soviet Military"
            },
            {
                "value": "Grad",
                "identifierType": "NAME_DESIGNATION",
                "issuingAuthority": "Soviet Military"
            },
            {
                "value": "9K51",
                "identifierType": "GRAU_DESIGNATION",
                "issuingAuthority": "GRAU"
            },
            {
                "value": "M-21OF",
                "identifierType": "ROCKET_DESIGNATION",
                "issuingAuthority": "Soviet Military"
            }
        ],
        "artilleryType": "multiple-rocket-launcher",
        "manufacturer": "Splav State Research and Production Enterprise",
        "model": "BM-21",
        "caliber": "122mm",
        "firstProduced": 1963,
        "enteredService": 1963,
        "operator": "Various Armed Forces",
        "location": OPERATION_CONFIG.displayName,
        "specifications": {
            "length": "7.35 m",
            "width": "2.40 m",
            "height": "2.85 m",
            "weight": "13,700 kg",
            "crew": 3,
            "classification": "Multiple Launch Rocket System",
            "chassis": "Ural-375D 6x6 truck",
            "rocketCaliber": "122mm",
            "numberOfTubes": 40,
            "rocketLength": "2.87 m",
            "rocketWeight": "66.6 kg",
            "warheadWeight": "6.4 kg",
            "minimumRange": "5 km",
            "maximumRange": "20.38 km",
            "reloadTime": "10 minutes",
            "salvoTime": "20 seconds",
            "deploymentRegion": OPERATION_CONFIG.displayName
        },
        "variants": [
            "BM-21 (original)",
            "BM-21-1 (improved)",
            "BM-21V (airborne version)",
            "BM-21PD (self-propelled)",
            "9P138 (modernized)"
        ],
        "capabilities": [
            "area saturation",
            "suppressive fire",
            "counter-battery",
            "bunker destruction",
            "personnel elimination",
            "soft target engagement"
        ],
        "ammunition": [
            "M-21OF (HE-Frag)",
            "M-21OF1 (improved HE-Frag)",
            "9M22U (practice round)",
            "9M28F (incendiary)",
            "9M43 (cluster munition)"
        ]
    };
    
    // Create artillery type definition for MLRS
    const mlrsType = {
        "id": "multiple-rocket-launcher",
        "name": "Multiple Launch Rocket System",
        "category": "artillery",
        "subcategory": "rocket artillery",
        "description": "Self-propelled multiple rocket launcher for area saturation attacks",
        "characteristics": [
            {
                "name": "primary_role",
                "value": "area saturation",
                "dataType": "string"
            },
            {
                "name": "crew_size",
                "value": "3",
                "dataType": "number"
            },
            {
                "name": "caliber_mm",
                "value": "122",
                "dataType": "number"
            },
            {
                "name": "tube_count",
                "value": "40",
                "dataType": "number"
            },
            {
                "name": "mobile_platform",
                "value": "true",
                "dataType": "boolean"
            },
            {
                "name": "max_range_km",
                "value": "20.38",
                "dataType": "number"
            }
        ]
    };
    
    // Add artillery array if it doesn't exist
    if (!data.artillery) {
        data.artillery = [];
    }
    
    // Add artilleryTypes array if it doesn't exist
    if (!data.artilleryTypes) {
        data.artilleryTypes = [];
    }
    
    // Check if BM-21 already exists
    const existingArtillery = data.artillery.find(a => 
        a.id.includes('artillery-bm21-grad') || 
        (a.names && a.names.some(name => 
            name.value === 'BM-21 Grad' || 
            name.value === 'БМ-21 "Град"' ||
            name.value === 'BM-21'
        ))
    );
    
    if (existingArtillery) {
        console.log(`ℹ️ BM-21 Grad already exists in ${OPERATION_CONFIG.displayName} database. Updating...`);
        const index = data.artillery.findIndex(a => a.id === existingArtillery.id);
        data.artillery[index] = { ...bm21Grad, id: existingArtillery.id };
    } else {
        data.artillery.push(bm21Grad);
    }
    
    // Add the artillery type if it doesn't already exist
    const existingArtilleryType = data.artilleryTypes.find(at => at.id === "multiple-rocket-launcher");
    if (!existingArtilleryType) {
        data.artilleryTypes.push(mlrsType);
    }
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Successfully added BM-21 Grad to ${OPERATION_CONFIG.displayName}`);
    console.log('📁 File location:', filePath);
    console.log('🆔 Added artillery ID:', bm21Grad.id);
    
    return data;
}

// Additional functions would follow the same pattern as SSu57.js...
// (Abbreviated for brevity, but would include all the web interface functions,
//  remove functions, diagnostic functions, etc.)

module.exports = {
    addBM21Grad,
    // ... other exports
};