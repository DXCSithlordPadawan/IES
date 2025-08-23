# Enhanced Military Equipment Category Filtering

## Overview
The IES (Intelligence Exchange Specification) repository has been enhanced with comprehensive filtering capabilities for military equipment categories. This enhancement provides users with powerful tools to filter and analyze military data based on specific equipment types and categories.

## New Filter Categories

### Equipment Categories
The system now supports 8 major military equipment categories:

1. **Aircraft & Unmanned Systems** (`aircraft_unmanned`)
   - Keywords: unmanned aircraft, aircraft, drone, uav, unmanned aerial vehicle
   - Covers: Fighter jets, transport aircraft, drones, UAVs

2. **Communication & Electronics** (`communication_electronics`)
   - Keywords: communication equipment, electronic system, computer system, sensor, sensor system, equipment, electronic_system, radar, radio, electronics
   - Covers: Radar systems, communication equipment, sensors, electronic warfare systems

3. **Weapons & Defense** (`weapons_defense`)
   - Keywords: artillery, missile, defense system, weapon, ammunition, gun, cannon, launcher, rocket, bomb
   - Covers: Artillery, missiles, defense systems, firearms, ammunition

4. **Vehicles** (`vehicles`)
   - Keywords: armored vehicle, vehicle, car, motorcycle, truck, bus, van, bicycle, tank, apc, armored
   - Covers: All types of vehicles including armored vehicles, trucks, tanks

5. **Naval Assets** (`naval_assets`)
   - Keywords: naval vessel, vessel, boat, watercraft, ship, submarine, destroyer, frigate, carrier
   - Covers: Ships, submarines, naval vessels, boats

6. **Transportation** (`transportation`)
   - Keywords: train, railway, locomotive, transport
   - Covers: Railway systems, trains, transport infrastructure

7. **Administrative** (`administrative`)
   - Keywords: organization, other, command, headquarters, base
   - Covers: Military organizations, commands, headquarters

8. **Geographic** (`geographic`)
   - Keywords: country, area, coordinates, location, region, territory
   - Covers: Geographic locations, areas, coordinates

## Implementation Features

### Backend Enhancements
- **New Filter Method**: `_filter_by_equipment_category()` supports single or multiple category selection
- **Comprehensive Keyword Matching**: Searches across multiple node attributes including labels, descriptions, and entity data
- **Category Information API**: `get_equipment_category_info()` provides category metadata for UI display
- **Enhanced Filter Suggestions**: Updated to include equipment categories

### Web Interface Enhancements
- **Multi-Select Category Filter**: Checkbox interface for selecting multiple equipment categories
- **Real-Time Filter Display**: Active filters show selected categories with count
- **Accordion UI**: Organized filter interface with expandable sections
- **Clear All Functionality**: Easy clearing of all selected filters

### API Endpoints
- `/api/equipment_categories` - Returns available equipment categories with descriptions
- `/api/filter_suggestions` - Enhanced to include equipment category suggestions
- `/api/analyze` - Supports equipment category filtering in analysis requests

## Usage Examples

### Backend (Python)
```python
from filter_system import FilterSystem
import networkx as nx

filter_sys = FilterSystem()

# Filter by single category
vehicles_only = filter_sys._filter_by_equipment_category(graph, 'vehicles')

# Filter by multiple categories
multi_category = filter_sys._filter_by_equipment_category(
    graph, ['aircraft_unmanned', 'weapons_defense']
)

# Apply in general filtering
filters = {'equipment_category': ['vehicles', 'naval_assets']}
filtered_graph = filter_sys.apply_filters(graph, filters)
```

### Frontend (JavaScript)
```javascript
// Load equipment categories
fetch('/api/equipment_categories')
    .then(response => response.json())
    .then(data => {
        // Populate UI with categories
        populateEquipmentCategories(data.categories);
    });

// Apply filters with equipment categories
const filters = {
    'equipment_category': ['aircraft_unmanned', 'weapons_defense'],
    'country': 'USA'
};

fetch('/api/analyze', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        database_name: 'example_db',
        filters: filters
    })
});
```

## Technical Implementation

### Filter Logic
The equipment category filter works by:
1. Mapping category names to keyword lists
2. Searching node attributes for matching keywords
3. Supporting both exact and partial keyword matches
4. Checking multiple data fields: type, labels, descriptions, entity data

### Performance Considerations
- Efficient keyword matching using lowercase comparisons
- Early termination when matches are found
- Set-based operations for combining multiple filters
- Lazy evaluation for large datasets

## Testing
The implementation includes comprehensive testing:
- Unit tests for category filtering functionality
- Integration tests for web interface components
- UI testing with screenshot verification
- Mock data testing for all 8 equipment categories

## Screenshots
The enhanced filtering interface provides:
- Clear category organization with descriptions
- Multi-select checkbox interface
- Active filter badges showing selections
- Responsive design for various screen sizes