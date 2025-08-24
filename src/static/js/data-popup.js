/**
 * Data Point Detail Popup System
 * Interactive popup for displaying detailed information about clicked data points
 * in the Analysis screen visualization.
 */

class DataPopupManager {
    constructor() {
        this.modal = null;
        this.currentDatabase = null;
        this.isInitialized = false;
        this.entityTypeIcons = {
            'vehicle': 'fas fa-truck',
            'area': 'fas fa-map-marker-alt', 
            'person': 'fas fa-user',
            'country': 'fas fa-flag',
            'organization': 'fas fa-building',
            'militaryOrganization': 'fas fa-shield-alt',
            'vehicleType': 'fas fa-cogs',
            'peopleType': 'fas fa-users',
            'representation': 'fas fa-image',
            'default': 'fas fa-info-circle'
        };
        
        this.init();
    }

    /**
     * Initialize the popup system
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            this.createPopupHTML();
            this.setupEventListeners();
            this.isInitialized = true;
            
            console.log('✅ Data popup system initialized');
        } catch (error) {
            console.error('❌ Error initializing popup system:', error);
            // Continue with limited functionality
            this.setupEventListeners();
            this.isInitialized = false;
        }
    }

    /**
     * Create the popup modal HTML structure
     */
    createPopupHTML() {
        // Check if modal already exists
        const existingModal = document.getElementById('dataPointModal');
        if (existingModal) {
            this.modal = this.createBootstrapModal(existingModal);
            return;
        }

        const modalHTML = `
            <div class="modal fade data-popup-modal" id="dataPointModal" tabindex="-1" aria-labelledby="dataPointModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content data-popup-content">
                        <div class="modal-header data-popup-header">
                            <h5 class="modal-title" id="dataPointModalLabel">
                                <i class="fas fa-info-circle"></i>
                                <span id="entityTitle">Entity Details</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="window.dataPopupManager && window.dataPopupManager.modal && window.dataPopupManager.modal.hide()"></button>
                        </div>
                        <div class="modal-body data-popup-body" id="dataPointModalBody">
                            <div class="loading-spinner">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3">Loading entity details...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Initialize Bootstrap modal
        this.modal = this.createBootstrapModal(document.getElementById('dataPointModal'));
    }

    /**
     * Create Bootstrap modal instance with fallback
     */
    createBootstrapModal(element) {
        // Check if Bootstrap is available
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            return new bootstrap.Modal(element);
        } else if (typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
            return new window.bootstrap.Modal(element);
        } else {
            // Fallback: create a simple modal interface
            console.warn('Bootstrap not available, using fallback modal');
            return {
                show: () => {
                    element.style.display = 'block';
                    element.classList.add('show');
                    document.body.classList.add('modal-open');
                },
                hide: () => {
                    element.style.display = 'none';
                    element.classList.remove('show');
                    document.body.classList.remove('modal-open');
                }
            };
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // ESC key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && document.getElementById('dataPointModal').classList.contains('show')) {
                this.modal.hide();
            }
        });

        // Click outside to close (optional)
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('dataPointModal');
            if (e.target === modal) {
                this.modal.hide();
            }
        });
    }

    /**
     * Set the current database for data fetching
     */
    setCurrentDatabase(database) {
        this.currentDatabase = database;
    }

    /**
     * Show popup with entity details
     */
    async showEntityDetails(entityId, entityType = null) {
        if (!this.modal) {
            console.error('Modal not initialized');
            return;
        }

        // Show modal with loading state
        this.showLoadingState();
        this.modal.show();

        try {
            // Fetch entity details
            const entityData = await this.fetchEntityDetails(entityId);
            
            if (entityData) {
                // Check if this is an error entity
                if (entityData.error) {
                    this.showErrorState(entityData.errorMessage, entityData.debugInfo);
                } else {
                    this.displayEntityData(entityData, entityType);
                }
            } else {
                this.showErrorState(`Entity with ID "${entityId}" not found`);
            }
        } catch (error) {
            console.error('Error fetching entity details:', error);
            this.showErrorState(`Failed to load entity details: ${error.message}`);
        }
    }

    /**
     * Show loading state in modal
     */
    showLoadingState() {
        const titleElement = document.getElementById('entityTitle');
        const bodyElement = document.getElementById('dataPointModalBody');
        
        titleElement.textContent = 'Loading Entity Details';
        bodyElement.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading entity details...</p>
            </div>
        `;
    }

    /**
     * Show error state in modal
     */
    showErrorState(message, debugInfo = null) {
        const titleElement = document.getElementById('entityTitle');
        const bodyElement = document.getElementById('dataPointModalBody');
        
        titleElement.textContent = 'Error Loading Entity';
        
        let debugContent = '';
        if (debugInfo) {
            debugContent = `
                <div class="debug-info mt-3">
                    <details>
                        <summary>Debug Information</summary>
                        <pre class="text-muted small mt-2">${JSON.stringify(debugInfo, null, 2)}</pre>
                    </details>
                </div>
            `;
        }
        
        bodyElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle fa-2x mb-3 text-warning"></i>
                <h5>Unable to Load Entity Details</h5>
                <p>${message}</p>
                ${debugContent}
                <div class="mt-3">
                    <small class="text-muted">
                        💡 This might happen if the entity data hasn't been loaded yet, 
                        or if there's a mismatch between the entity ID and the database structure.
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Ensure database is loaded for the current database
     */
    async ensureDatabaseLoaded() {
        if (!this.currentDatabase) {
            console.log('🔄 No current database set, defaulting to OP7');
            this.currentDatabase = 'OP7';
            window.currentDatabase = 'OP7';
        }
        
        // Check if database manager is available and initialized
        if (!window.databaseManager) {
            console.warn('⚠️ Database manager not available');
            return false;
        }
        
        if (!window.databaseManager.isInitialized) {
            console.log('🔄 Database manager not initialized, initializing...');
            try {
                await window.databaseManager.initializeWithOP7();
            } catch (error) {
                console.error('❌ Failed to initialize database manager:', error);
                return false;
            }
        }
        
        // Check if current database data is loaded
        if (!window.databaseManager.databases || !window.databaseManager.databases[this.currentDatabase]) {
            console.log(`🔄 Loading data for database: ${this.currentDatabase}`);
            try {
                await window.databaseManager.loadDatabaseData(this.currentDatabase);
            } catch (error) {
                console.error(`❌ Failed to load database ${this.currentDatabase}:`, error);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Fetch entity details from the server
     */
    async fetchEntityDetails(entityId) {
        try {
            console.log('🔍 Fetching entity details for ID:', entityId);
            console.log('📋 Current database:', this.currentDatabase);
            
            // Ensure database is loaded
            const dbReady = await this.ensureDatabaseLoaded();
            if (!dbReady) {
                console.warn('⚠️ Database not ready, proceeding with limited functionality');
            }
            
            // First try to get from current analysis data if available
            if (window.currentVisualization && window.currentVisualization.data) {
                const plotlyData = window.currentVisualization.data;
                console.log('📊 Searching in current visualization data...');
                
                // Look for the entity in Plotly data
                for (const trace of plotlyData) {
                    // Check customdata first (enhanced data from our fix)
                    if (trace.customdata) {
                        for (let i = 0; i < trace.customdata.length; i++) {
                            const data = trace.customdata[i];
                            if (data && data.id === entityId) {
                                console.log('✅ Found entity in customdata:', data);
                                return {
                                    ...data.data, // Include the actual entity data
                                    id: data.id,
                                    type: data.type,
                                    label: data.label
                                };
                            }
                        }
                    }
                    
                    // Also check text and ids arrays (legacy support)
                    if (trace.text && trace.ids) {
                        const index = trace.ids.indexOf(entityId);
                        if (index !== -1) {
                            console.log('✅ Found entity in trace ids at index:', index);
                            return {
                                id: entityId,
                                name: trace.text[index],
                                type: trace.name || 'Unknown',
                                x: trace.x ? trace.x[index] : null,
                                y: trace.y ? trace.y[index] : null
                            };
                        }
                    }
                }
                console.log('⚠️ Entity not found in current visualization data');
            }

            // Try multiple approaches to find the entity
            let entityData = null;
            
            // Approach 1: Try server API if database is set
            if (this.currentDatabase) {
                console.log('🌐 Trying to fetch from server API...');
                try {
                    const response = await fetch(`/api/entity/${entityId}?database=${this.currentDatabase}`);
                    if (response.ok) {
                        const serverData = await response.json();
                        if (serverData.status === 'success' && serverData.entity) {
                            console.log('✅ Found entity data from server:', serverData.entity);
                            entityData = serverData.entity;
                        } else {
                            console.log('❌ Server responded but no entity found:', serverData);
                        }
                    } else {
                        console.log('❌ Server response not ok:', response.status, response.statusText);
                    }
                } catch (serverError) {
                    console.warn('⚠️ Server API call failed:', serverError);
                }
            }

            // Approach 2: Try searching in loaded database
            if (!entityData) {
                console.log('🔍 Searching in loaded database...');
                entityData = await this.searchInLoadedDatabase(entityId);
                if (entityData) {
                    console.log('✅ Found entity in loaded database:', entityData);
                }
            }
            
            // Approach 3: Try to provide helpful error information
            if (!entityData) {
                console.log('❌ Entity not found in any data source');
                console.log('🔧 Debug information:');
                console.log('   - Entity ID:', entityId);
                console.log('   - Current database:', this.currentDatabase);
                console.log('   - Window databaseManager available:', !!(window.databaseManager));
                console.log('   - Window currentVisualization available:', !!(window.currentVisualization));
                
                // Provide a helpful error object instead of null
                return {
                    id: entityId,
                    name: `Entity ${entityId}`,
                    type: 'Unknown',
                    error: true,
                    errorMessage: `Unable to find entity with ID '${entityId}' in database '${this.currentDatabase || 'unknown'}'`,
                    debugInfo: {
                        searchedDatabase: this.currentDatabase,
                        hasVisualizationData: !!(window.currentVisualization),
                        hasDatabaseManager: !!(window.databaseManager)
                    }
                };
            }
            
            return entityData;
            
        } catch (error) {
            console.error('❌ Error fetching entity details:', error);
            
            // Return error entity instead of throwing
            return {
                id: entityId,
                name: `Error loading ${entityId}`,
                type: 'Error',
                error: true,
                errorMessage: `Error loading entity: ${error.message}`,
                debugInfo: {
                    error: error.toString(),
                    stack: error.stack
                }
            };
        }
    }

    /**
     * Search for entity in the currently loaded database
     */
    async searchInLoadedDatabase(entityId) {
        try {
            console.log('🔍 Searching in loaded database for:', entityId);
            console.log('📋 Current database:', this.currentDatabase);
            
            // First try to get from window.databaseManager if available
            if (window.databaseManager && window.databaseManager.databases && this.currentDatabase) {
                const database = window.databaseManager.databases[this.currentDatabase];
                console.log('📊 Database manager data available:', !!database);
                
                if (database) {
                    // Use the new getEntity method if available
                    if (window.databaseManager.getEntity) {
                        const entity = window.databaseManager.getEntity(entityId, this.currentDatabase);
                        if (entity) {
                            console.log('✅ Found entity via getEntity method:', entity);
                            return entity;
                        }
                    } else {
                        // Fallback to manual search
                        const entityTypes = ['vehicles', 'areas', 'people', 'countries', 'militaryOrganizations', 'vehicleTypes', 'peopleTypes'];
                        
                        for (const entityType of entityTypes) {
                            if (database[entityType] && Array.isArray(database[entityType])) {
                                console.log(`   Checking ${entityType} (${database[entityType].length} entries)...`);
                                const entity = database[entityType].find(e => e.id === entityId);
                                if (entity) {
                                    console.log('✅ Found entity in database manager:', entity);
                                    return { ...entity, entityType };
                                }
                            }
                        }
                    }
                }
            } else {
                console.log('⚠️ Database manager not available or no current database set');
                console.log('   - databaseManager available:', !!window.databaseManager);
                console.log('   - databases property:', !!(window.databaseManager && window.databaseManager.databases));
                console.log('   - currentDatabase:', this.currentDatabase);
            }
            
            // If database manager is not available, try to fetch data directly from server
            if (this.currentDatabase) {
                console.log('🌐 Attempting direct server lookup...');
                try {
                    const response = await fetch(`/api/entity/${entityId}?database=${this.currentDatabase}`);
                    if (response.ok) {
                        const serverData = await response.json();
                        if (serverData.status === 'success' && serverData.entity) {
                            console.log('✅ Found entity via direct server lookup:', serverData.entity);
                            return serverData.entity;
                        }
                    } else {
                        console.log('❌ Server response not ok:', response.status, response.statusText);
                    }
                } catch (serverError) {
                    console.warn('⚠️ Direct server lookup failed:', serverError);
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error searching in loaded database:', error);
            return null;
        }
    }

    /**
     * Display entity data in the modal
     */
    displayEntityData(entityData, entityType) {
        const titleElement = document.getElementById('entityTitle');
        const bodyElement = document.getElementById('dataPointModalBody');
        const modalTitle = document.querySelector('.data-popup-header .modal-title');
        
        // Determine entity type
        const type = entityType || entityData.type || entityData.entityType || 'default';
        const icon = this.entityTypeIcons[type] || this.entityTypeIcons.default;
        
        // Get entity name
        const name = this.getEntityName(entityData);
        
        // Update modal title
        modalTitle.innerHTML = `<i class="${icon}"></i> <span id="entityTitle">${name}</span>`;
        
        // Generate entity type badge
        const typeBadge = `<div class="entity-type-badge entity-type-${type.toLowerCase()}">${type.replace(/([A-Z])/g, ' $1').trim()}</div>`;
        
        // Generate content
        const content = this.generateEntityContent(entityData);
        
        bodyElement.innerHTML = typeBadge + content;
    }

    /**
     * Get the display name for an entity
     */
    getEntityName(entityData) {
        if (entityData.names && Array.isArray(entityData.names) && entityData.names.length > 0) {
            // Prefer official name, fallback to first available
            const officialName = entityData.names.find(n => n.nameType === 'official');
            return officialName ? officialName.value : entityData.names[0].value;
        }
        
        return entityData.name || entityData.value || entityData.id || 'Unknown Entity';
    }

    /**
     * Generate the main content for entity display
     */
    generateEntityContent(entityData) {
        let content = '';
        
        // Basic Information Section
        content += this.generateSection('Basic Information', 'fas fa-info-circle', this.formatBasicInfo(entityData));
        
        // Identifiers Section
        if (entityData.identifiers && entityData.identifiers.length > 0) {
            content += this.generateSection('Identifiers', 'fas fa-tag', this.formatIdentifiers(entityData.identifiers));
        }
        
        // Names Section
        if (entityData.names && entityData.names.length > 1) {
            content += this.generateSection('Names & Aliases', 'fas fa-list', this.formatNames(entityData.names));
        }
        
        // Specifications Section
        if (entityData.specifications) {
            content += this.generateSection('Specifications', 'fas fa-cogs', this.formatSpecifications(entityData.specifications));
        }
        
        // Location Section
        if (entityData.coordinates || entityData.geographicBounds) {
            content += this.generateSection('Location', 'fas fa-map-marker-alt', this.formatLocation(entityData));
        }
        
        // States/Events Section
        if (entityData.states && entityData.states.length > 0) {
            content += this.generateSection('States & Events', 'fas fa-history', this.formatStates(entityData.states));
        }
        
        // Additional Properties Section
        const additionalProps = this.getAdditionalProperties(entityData);
        if (additionalProps.length > 0) {
            content += this.generateSection('Additional Properties', 'fas fa-ellipsis-h', additionalProps.join(''));
        }
        
        return content;
    }

    /**
     * Generate a section with title and content
     */
    generateSection(title, icon, content) {
        if (!content) return '';
        
        return `
            <div class="data-section">
                <div class="data-section-title">
                    <i class="${icon}"></i>
                    ${title}
                </div>
                ${content}
            </div>
        `;
    }

    /**
     * Format basic information
     */
    formatBasicInfo(entityData) {
        let html = '';
        
        // ID
        if (entityData.id) {
            html += this.formatField('ID', entityData.id);
        }
        
        // Type
        if (entityData.type) {
            html += this.formatField('Type', entityData.type);
        }
        
        // URI
        if (entityData.uri) {
            html += this.formatField('URI', `<a href="${entityData.uri}" target="_blank" class="uri-link">${entityData.uri}</a>`);
        }
        
        // Make, Model, Year for vehicles
        if (entityData.make) {
            html += this.formatField('Make', entityData.make);
        }
        if (entityData.model) {
            html += this.formatField('Model', entityData.model);
        }
        if (entityData.year) {
            html += this.formatField('Year', entityData.year);
        }
        
        // Version and Timestamp
        if (entityData.version) {
            html += this.formatField('Version', entityData.version);
        }
        if (entityData.timestamp) {
            html += this.formatField('Timestamp', `<span class="timestamp-display">${entityData.timestamp}</span>`);
        }
        
        return html;
    }

    /**
     * Format identifiers
     */
    formatIdentifiers(identifiers) {
        let html = '';
        identifiers.forEach(identifier => {
            const label = identifier.identifierType || 'Identifier';
            const value = identifier.value + (identifier.issuingAuthority ? ` (${identifier.issuingAuthority})` : '');
            html += this.formatField(label, value);
        });
        return html;
    }

    /**
     * Format names
     */
    formatNames(names) {
        let html = '';
        names.forEach(name => {
            const label = name.nameType || 'Name';
            const value = name.value + (name.language ? ` (${name.language})` : '');
            html += this.formatField(label, value);
        });
        return html;
    }

    /**
     * Format specifications
     */
    formatSpecifications(specs) {
        if (typeof specs === 'object') {
            let html = '';
            Object.entries(specs).forEach(([key, value]) => {
                html += this.formatField(key.replace(/_/g, ' '), value);
            });
            return html;
        }
        return this.formatField('Specifications', specs);
    }

    /**
     * Format location information
     */
    formatLocation(entityData) {
        let html = '';
        
        if (entityData.coordinates) {
            const coords = entityData.coordinates;
            if (coords.coordinates && Array.isArray(coords.coordinates)) {
                const [lng, lat] = coords.coordinates;
                html += this.formatField('Coordinates', `<div class="coordinates-display">Lat: ${lat}, Lng: ${lng}</div>`);
            }
            if (coords.crs) {
                html += this.formatField('Coordinate System', coords.crs);
            }
        }
        
        if (entityData.geographicBounds) {
            html += this.formatField('Geographic Bounds', '<div class="coordinates-display">Geographic boundary defined</div>');
        }
        
        return html;
    }

    /**
     * Format states and events
     */
    formatStates(states) {
        let html = '';
        states.forEach((state, index) => {
            html += `<div class="nested-object">`;
            html += this.formatField('State Type', state.stateType || 'Unknown');
            if (state.startTime) {
                html += this.formatField('Start Time', `<span class="timestamp-display">${state.startTime}</span>`);
            }
            if (state.location) {
                html += this.formatField('Location', state.location);
            }
            html += `</div>`;
        });
        return html;
    }

    /**
     * Get additional properties not covered by specific sections
     */
    getAdditionalProperties(entityData) {
        const excludedKeys = [
            'id', 'type', 'uri', 'names', 'identifiers', 'coordinates', 'geographicBounds',
            'make', 'model', 'year', 'version', 'timestamp', 'specifications', 'states',
            'entityType', 'name', 'value'
        ];
        
        const additional = [];
        Object.entries(entityData).forEach(([key, value]) => {
            if (!excludedKeys.includes(key) && value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        additional.push(this.formatArrayField(key, value));
                    }
                } else if (typeof value === 'object') {
                    additional.push(this.formatObjectField(key, value));
                } else {
                    additional.push(this.formatField(key, value));
                }
            }
        });
        
        return additional;
    }

    /**
     * Format a single field
     */
    formatField(label, value) {
        return `
            <div class="data-field">
                <div class="data-field-label">${label}:</div>
                <div class="data-field-value">${value}</div>
            </div>
        `;
    }

    /**
     * Format an array field
     */
    formatArrayField(label, array) {
        const items = array.map(item => `<span class="array-item">${item}</span>`).join('');
        return `
            <div class="data-field">
                <div class="data-field-label">${label}:</div>
                <div class="data-field-value array-value">${items}</div>
            </div>
        `;
    }

    /**
     * Format an object field
     */
    formatObjectField(label, obj) {
        let content = '<div class="nested-object">';
        Object.entries(obj).forEach(([key, value]) => {
            content += this.formatField(key, value);
        });
        content += '</div>';
        
        return `
            <div class="data-field">
                <div class="data-field-label">${label}:</div>
                <div class="data-field-value">${content}</div>
            </div>
        `;
    }

    /**
     * Debug helper: Check what databases and entities are available
     */
    debugAvailableData() {
        console.log('🔧 Debug: Checking available data sources...');
        
        // Check window.databaseManager
        if (window.databaseManager) {
            console.log('📊 DatabaseManager available');
            if (window.databaseManager.databases) {
                console.log('   Available databases:', Object.keys(window.databaseManager.databases));
                
                Object.entries(window.databaseManager.databases).forEach(([dbName, dbData]) => {
                    console.log(`   Database ${dbName}:`);
                    const entityTypes = ['vehicles', 'areas', 'people', 'countries', 'militaryOrganizations', 'vehicleTypes'];
                    entityTypes.forEach(type => {
                        if (dbData[type] && Array.isArray(dbData[type])) {
                            console.log(`     ${type}: ${dbData[type].length} entities`);
                            if (dbData[type].length > 0) {
                                console.log(`       Example IDs: ${dbData[type].slice(0, 3).map(e => e.id).join(', ')}`);
                            }
                        }
                    });
                });
            }
        } else {
            console.log('❌ DatabaseManager not available');
        }
        
        // Check window.currentVisualization
        if (window.currentVisualization) {
            console.log('📈 CurrentVisualization available');
            if (window.currentVisualization.data) {
                console.log('   Traces:', window.currentVisualization.data.length);
                window.currentVisualization.data.forEach((trace, i) => {
                    if (trace.ids) {
                        console.log(`   Trace ${i}: ${trace.ids.length} entities`);
                        console.log(`     Example IDs: ${trace.ids.slice(0, 3).join(', ')}`);
                    }
                });
            }
        } else {
            console.log('❌ CurrentVisualization not available');
        }
        
        // Check current database
        console.log('📋 Current database:', this.currentDatabase);
        console.log('📋 Window.currentDatabase:', window.currentDatabase);
    }
}

/**
 * Add click handler to Plotly visualization
 */
function addPlotlyClickHandler() {
    const vizElement = document.getElementById('visualization-area');
    if (!vizElement) return;

    // Remove existing click handlers to avoid duplicates
    vizElement.removeAllListeners && vizElement.removeAllListeners('plotly_click');
    
    // Add click handler
    vizElement.on('plotly_click', function(data) {
        if (data.points && data.points.length > 0) {
            const point = data.points[0];
            
            console.log('🖱️ Click event data:', point);
            
            // Extract entity information from the clicked point
            let entityId = null;
            let entityType = null;
            let entityData = null;
            
            // Priority 1: Try customdata first (enhanced with our fix)
            if (point.customdata && point.customdata.id) {
                entityId = point.customdata.id;
                entityType = point.customdata.type;
                entityData = point.customdata.data;
                console.log('✅ Found entity ID in customdata:', entityId);
            }
            // Priority 2: Try trace ids array with point number
            else if (point.pointNumber !== undefined && point.data.ids && point.data.ids[point.pointNumber]) {
                entityId = point.data.ids[point.pointNumber];
                console.log('✅ Found entity ID in trace ids:', entityId);
            }
            // Priority 3: Try point.id directly
            else if (point.id) {
                entityId = point.id;
                console.log('✅ Found entity ID in point.id:', entityId);
            }
            // Priority 4: Fallback to text (least reliable)
            else if (point.text && point.text.trim() !== '') {
                entityId = point.text.trim();
                console.log('⚠️ Using text as entity ID fallback:', entityId);
            }
            
            // Try to get entity type from trace name if not already found
            if (!entityType && point.data.name) {
                // Extract the actual entity type from trace name (remove count suffix)
                const traceName = point.data.name.toLowerCase();
                if (traceName.includes('vehicle')) {
                    entityType = 'vehicle';
                } else if (traceName.includes('country')) {
                    entityType = 'country';
                } else if (traceName.includes('organization')) {
                    entityType = 'militaryOrganization';
                } else if (traceName.includes('area')) {
                    entityType = 'area';
                } else if (traceName.includes('person')) {
                    entityType = 'person';
                } else {
                    entityType = traceName.split(' ')[0]; // Use first word as type
                }
                console.log('🔍 Extracted entity type from trace name:', entityType);
            }
            
            if (entityId) {
                console.log('🎯 Final entity info:', { id: entityId, type: entityType, hasData: !!entityData });
                
                // Show popup with entity details
                if (window.dataPopupManager) {
                    window.dataPopupManager.showEntityDetails(entityId, entityType);
                } else {
                    console.warn('❌ Data popup manager not initialized');
                }
            } else {
                console.warn('❌ Could not extract entity ID from clicked point. Available data:', {
                    pointNumber: point.pointNumber,
                    hasIds: !!(point.data && point.data.ids),
                    hasCustomdata: !!point.customdata,
                    text: point.text,
                    id: point.id,
                    dataName: point.data?.name
                });
            }
        }
    });
    
    console.log('✅ Enhanced Plotly click handler added with better entity ID extraction');
}

/**
 * Initialize the popup system when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup manager
    try {
        console.log('🚀 Initializing data popup manager...');
        window.dataPopupManager = new DataPopupManager();
        
        // Initialize database manager with OP7 data if not already done
        if (window.databaseManager && !window.databaseManager.isInitialized) {
            window.databaseManager.initializeWithOP7();
        }
        
        // Set default database if not set
        if (!window.currentDatabase) {
            window.currentDatabase = 'OP7';
            if (window.dataPopupManager) {
                window.dataPopupManager.setCurrentDatabase('OP7');
            }
        }
        
        // Add click handler when visualization is created
        const originalDisplayVisualization = window.displayVisualization;
        if (originalDisplayVisualization) {
            window.displayVisualization = function(data) {
                originalDisplayVisualization(data);
                
                // Set current database for popup manager
                if (window.dataPopupManager && window.currentDatabase) {
                    window.dataPopupManager.setCurrentDatabase(window.currentDatabase);
                }
                
                // Add click handler after a short delay to ensure Plotly is ready
                setTimeout(addPlotlyClickHandler, 500);
            };
        }
    } catch (error) {
        console.error('❌ Failed to initialize data popup manager:', error);
    }
});

// Export for global access
window.DataPopupManager = DataPopupManager;
window.addPlotlyClickHandler = addPlotlyClickHandler;

console.log('📊 Data popup system loaded successfully');