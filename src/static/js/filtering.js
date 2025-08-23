/* Enhanced Military Equipment Filtering JavaScript */
/* Comprehensive filtering functionality for equipment categories */

// Global variables for filtering state
let currentFilters = {};
let equipmentCategories = {};
let currentDatabase = '';
let currentVisualization = null;

// Equipment categories data structure
const defaultEquipmentCategories = {
    'aircraft_unmanned': {
        'label': 'Aircraft & Unmanned Systems',
        'description': 'Fighter jets, helicopters, drones, and unmanned aerial vehicles',
        'keywords': ['aircraft', 'helicopter', 'drone', 'uav', 'fighter', 'jet', 'plane', 'aviation']
    },
    'communication_electronics': {
        'label': 'Communication & Electronics Equipment',
        'description': 'Communication systems, radar, electronic warfare equipment',
        'keywords': ['radio', 'communication', 'radar', 'electronic', 'antenna', 'satellite', 'signal']
    },
    'weapons_defense': {
        'label': 'Weapons & Defense Systems',
        'description': 'Small arms, artillery, missiles, defense systems',
        'keywords': ['weapon', 'gun', 'rifle', 'missile', 'artillery', 'defense', 'armor', 'ammunition']
    },
    'vehicle_categories': {
        'label': 'Vehicle Categories',
        'description': 'Tanks, armored vehicles, trucks, transport vehicles',
        'keywords': ['tank', 'vehicle', 'truck', 'armored', 'transport', 'car', 'motorcycle', 'trailer']
    },
    'naval_assets': {
        'label': 'Naval Assets',
        'description': 'Ships, submarines, naval vessels, maritime equipment',
        'keywords': ['ship', 'boat', 'submarine', 'naval', 'vessel', 'maritime', 'fleet', 'carrier']
    },
    'transportation': {
        'label': 'Transportation',
        'description': 'General transportation equipment and logistics',
        'keywords': ['transport', 'logistics', 'cargo', 'supply', 'movement', 'mobility']
    },
    'administrative_geographic': {
        'label': 'Administrative & Geographic',
        'description': 'Administrative units, geographic data, facilities',
        'keywords': ['administrative', 'geographic', 'facility', 'base', 'location', 'area', 'region']
    }
};

// Initialize filtering system
document.addEventListener('DOMContentLoaded', function() {
    initializeFiltering();
    loadEquipmentCategories();
    setupFilterEventListeners();
});

function initializeFiltering() {
    console.log('Initializing enhanced filtering system...');
    
    // Initialize equipment categories with defaults
    equipmentCategories = { ...defaultEquipmentCategories };
    
    // Load equipment categories from API if available
    fetch('/api/equipment_categories')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.categories) {
                equipmentCategories = data.categories;
                console.log('Loaded equipment categories from API:', Object.keys(equipmentCategories).length);
            } else {
                console.log('Using default equipment categories');
            }
            populateEquipmentCategoryCheckboxes();
        })
        .catch(error => {
            console.log('API not available, using default categories:', error.message);
            populateEquipmentCategoryCheckboxes();
        });
}

function loadEquipmentCategories() {
    // Try to load from API, fall back to defaults
    fetch('/api/equipment_categories')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                equipmentCategories = data.categories;
            }
            populateEquipmentCategoryCheckboxes();
        })
        .catch(error => {
            console.log('Using default equipment categories');
            populateEquipmentCategoryCheckboxes();
        });
}

function populateEquipmentCategoryCheckboxes() {
    const container = document.getElementById('equipment-category-checkboxes');
    if (!container) {
        console.log('Equipment category checkboxes container not found');
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(equipmentCategories).forEach(([key, category]) => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check equipment-category-checkbox';
        
        checkboxDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" id="category_${key}" value="${key}">
            <label class="form-check-label" for="category_${key}">
                ${category.label}
                <small>${category.description}</small>
            </label>
        `;
        
        container.appendChild(checkboxDiv);
    });
    
    console.log('Populated equipment category checkboxes:', Object.keys(equipmentCategories).length);
}

function setupFilterEventListeners() {
    // Apply filters button
    const applyBtn = document.querySelector('button[onclick="applyFilters()"]');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    // Clear filters button
    const clearBtn = document.querySelector('button[onclick="clearFilters()"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Auto-apply on checkbox changes (optional)
    document.addEventListener('change', function(e) {
        if (e.target.matches('input[id^="category_"]')) {
            // Optionally auto-apply filters on checkbox change
            // applyFilters();
        }
    });
}

function applyFilters() {
    console.log('Applying filters...');
    
    // Reset current filters
    currentFilters = {};
    
    // Collect country filter
    const countrySelect = document.getElementById('countryFilterSelect');
    if (countrySelect && countrySelect.value) {
        currentFilters.country = countrySelect.value;
    }
    
    // Collect keyword filter
    const keywordInput = document.getElementById('keywordInput');
    if (keywordInput && keywordInput.value.trim()) {
        currentFilters.keyword = keywordInput.value.trim();
    }
    
    // Collect selected equipment categories
    const selectedCategories = [];
    document.querySelectorAll('input[id^="category_"]:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });
    
    if (selectedCategories.length > 0) {
        currentFilters.equipment_category = selectedCategories;
    }
    
    console.log('Current filters:', currentFilters);
    
    // Update active filters display
    updateActiveFilters();
    
    // Run analysis with filters if database is selected
    const databaseSelect = document.getElementById('databaseSelect');
    if (databaseSelect && databaseSelect.value) {
        currentDatabase = databaseSelect.value;
        runAnalysis();
    } else {
        showNotification('Please select a database first', 'warning');
    }
}

function clearFilters() {
    console.log('Clearing all filters...');
    
    // Reset filters object
    currentFilters = {};
    
    // Clear form fields
    const countrySelect = document.getElementById('countryFilterSelect');
    if (countrySelect) countrySelect.value = '';
    
    const keywordInput = document.getElementById('keywordInput');
    if (keywordInput) keywordInput.value = '';
    
    // Clear equipment category checkboxes
    document.querySelectorAll('input[id^="category_"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Update display
    updateActiveFilters();
    
    // Re-run analysis without filters if database is selected
    const databaseSelect = document.getElementById('databaseSelect');
    if (databaseSelect && databaseSelect.value) {
        runAnalysis();
    }
}

function updateActiveFilters() {
    const activeFiltersDiv = document.getElementById('active-filters');
    if (!activeFiltersDiv) return;
    
    if (Object.keys(currentFilters).length === 0) {
        activeFiltersDiv.innerHTML = '<small class="text-muted">No active filters</small>';
    } else {
        let html = '';
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (key === 'equipment_category' && Array.isArray(value)) {
                // Special handling for equipment categories
                html += `<span class="filter-badge">${key.replace('_', ' ')}: ${value.length} selected</span>`;
            } else {
                html += `<span class="filter-badge">${key.replace('_', ' ')}: ${value}</span>`;
            }
        });
        activeFiltersDiv.innerHTML = html;
    }
}

function runAnalysis() {
    const databaseSelect = document.getElementById('databaseSelect');
    const layoutSelect = document.getElementById('layoutSelect');
    const showLabelsCheck = document.getElementById('showLabels');
    
    if (!databaseSelect || !databaseSelect.value) {
        showError('Please select a database first');
        return;
    }
    
    const database = databaseSelect.value;
    const layout = layoutSelect ? layoutSelect.value : 'spring';
    const showLabels = showLabelsCheck ? showLabelsCheck.checked : true;
    
    console.log('Running analysis with filters:', currentFilters);
    
    // Show loading state
    const visualizationArea = document.getElementById('visualization-area');
    if (visualizationArea) {
        visualizationArea.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <h5>Analyzing ${database.replace(/_/g, ' ')}...</h5>
                <p class="text-muted">Building network graph with filters and applying layout</p>
            </div>
        `;
    }
    
    const analysisData = {
        database_name: database,
        layout: layout,
        show_labels: showLabels,
        filters: currentFilters
    };
    
    fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            displayVisualization(data);
            updateStats(data);
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) exportBtn.style.display = 'block';
            showNotification('Analysis completed successfully!', 'success');
        } else {
            showError('Analysis failed: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Analysis error:', error);
        showError('Connection error during analysis');
    });
}

function displayVisualization(data) {
    if (!data.visualization || !data.visualization.data) {
        showError('No visualization data received');
        return;
    }
    
    const visualizationArea = document.getElementById('visualization-area');
    if (!visualizationArea) return;
    
    try {
        // Create Plotly visualization
        const plotData = data.visualization.data;
        const plotLayout = data.visualization.layout || {};
        
        // Enhanced layout for military analysis
        const enhancedLayout = {
            ...plotLayout,
            title: `Military Equipment Analysis - ${currentDatabase.replace(/_/g, ' ')}`,
            showlegend: true,
            hovermode: 'closest',
            margin: { t: 50, l: 50, r: 50, b: 50 },
            font: { family: 'Arial, sans-serif' }
        };
        
        Plotly.newPlot('visualization-area', plotData, enhancedLayout, {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['autoScale2d', 'resetScale2d'],
            displaylogo: false
        });
        
        currentVisualization = data.visualization;
        
    } catch (error) {
        console.error('Error creating visualization:', error);
        showError('Error displaying visualization: ' + error.message);
    }
}

function updateStats(data) {
    if (!data.statistics) return;
    
    const stats = data.statistics;
    
    // Update statistics display
    const statsElements = {
        'total-nodes': stats.total_nodes || 0,
        'total-edges': stats.total_edges || 0,
        'node-types': stats.node_types || 0,
        'components': stats.connected_components || 0
    };
    
    Object.entries(statsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toLocaleString();
        }
    });
    
    // Update filtered results count if filters are applied
    if (Object.keys(currentFilters).length > 0) {
        const filteredCount = stats.filtered_nodes || stats.total_nodes;
        const filterSummary = document.getElementById('filter-summary');
        if (filterSummary) {
            filterSummary.innerHTML = `
                <strong>Filtered Results:</strong> ${filteredCount.toLocaleString()} nodes
                <br><small class="text-muted">Original: ${stats.total_nodes.toLocaleString()} nodes</small>
            `;
        }
    }
}

function exportVisualization() {
    if (currentVisualization) {
        const filename = `military_analysis_${currentDatabase}_${Date.now()}`;
        
        Plotly.downloadImage('visualization-area', {
            format: 'png',
            filename: filename,
            height: 800,
            width: 1200
        }).then(() => {
            showNotification('Visualization exported successfully!', 'success');
        }).catch(error => {
            console.error('Export error:', error);
            showNotification('Export failed: ' + error.message, 'error');
        });
    } else {
        showNotification('No visualization to export. Please run an analysis first.', 'warning');
    }
}

function exportFilteredData() {
    if (Object.keys(currentFilters).length === 0) {
        showNotification('No filters applied. Apply filters before exporting.', 'warning');
        return;
    }
    
    const exportData = {
        database: currentDatabase,
        filters: currentFilters,
        format: 'json'
    };
    
    fetch('/api/export_filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('Export failed');
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filtered_data_${currentDatabase}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Filtered data exported successfully!', 'success');
    })
    .catch(error => {
        console.error('Export error:', error);
        showNotification('Export failed: ' + error.message, 'error');
    });
}

function showError(message) {
    console.error('Error:', message);
    
    const visualizationArea = document.getElementById('visualization-area');
    if (visualizationArea) {
        visualizationArea.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5><i class="fas fa-exclamation-circle me-2"></i>Analysis Error</h5>
                <p>${message}</p>
            </div>
        `;
    }
    
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)} me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Export functions for global access
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.runAnalysis = runAnalysis;
window.exportVisualization = exportVisualization;
window.exportFilteredData = exportFilteredData;

console.log('Enhanced filtering JavaScript loaded successfully');