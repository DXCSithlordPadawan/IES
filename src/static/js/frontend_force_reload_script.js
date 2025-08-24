/**
 * Frontend JavaScript to ensure fresh data loading when "Run Analysis" is clicked
 * Add this script to your HTML templates (index.html, dashboard.html, analysis.html)
 */

class DatabaseManager {
    constructor() {
        this.baseUrl = window.location.origin;
        this.lastAnalysisTime = {};
        this.fileChecksums = {};
    }

    /**
     * Check if database file has been modified since last analysis
     */
    async checkFileStatus(databaseName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/check_file_status?database=${databaseName}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    hasChanged: this.hasFileChanged(databaseName, data.file_mod_time),
                    syncStatus: data.data_sync_status,
                    fileInfo: data
                };
            }
            return { hasChanged: true, syncStatus: 'unknown', fileInfo: null };
        } catch (error) {
            console.warn('Could not check file status:', error);
            return { hasChanged: true, syncStatus: 'unknown', fileInfo: null };
        }
    }

    /**
     * Check if file modification time has changed
     */
    hasFileChanged(databaseName, currentModTime) {
        const lastModTime = this.fileChecksums[databaseName];
        const hasChanged = !lastModTime || lastModTime !== currentModTime;
        
        if (hasChanged) {
            this.fileChecksums[databaseName] = currentModTime;
        }
        
        return hasChanged;
    }

    /**
     * Force reload a database
     */
    async forceReloadDatabase(databaseName) {
        try {
            console.log(`🔄 Force reloading database: ${databaseName}`);
            
            const response = await fetch(`${this.baseUrl}/api/force_reload_database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    database_name: databaseName
                })
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                console.log(`✅ Successfully reloaded ${databaseName}`);
                return true;
            } else {
                console.error(`❌ Failed to reload ${databaseName}:`, data.message);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error reloading ${databaseName}:`, error);
            return false;
        }
    }

    /**
     * Run analysis with automatic fresh data loading
     */
    async runAnalysisWithFreshData(databaseName, options = {}) {
        const defaultOptions = {
            layout: 'spring',
            show_labels: true,
            filters: {},
            force_reload: true
        };
        
        const analysisOptions = { ...defaultOptions, ...options };

        try {
            // Step 1: Check if file has changed
            console.log(`🔍 Checking file status for ${databaseName}`);
            const fileStatus = await this.checkFileStatus(databaseName);
            
            // Step 2: Force reload if file changed or data is out of sync
            if (fileStatus.hasChanged || fileStatus.syncStatus === 'out_of_sync') {
                console.log(`📥 File changed or out of sync, force reloading ${databaseName}`);
                const reloadSuccess = await this.forceReloadDatabase(databaseName);
                
                if (!reloadSuccess) {
                    console.warn('⚠️ Force reload failed, proceeding with analysis anyway');
                }
            } else {
                console.log(`✅ ${databaseName} is up to date`);
            }

            // Step 3: Run analysis with force_reload flag
            console.log(`🔬 Running analysis for ${databaseName}`);
            const response = await fetch(`${this.baseUrl}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    database_name: databaseName,
                    ...analysisOptions
                })
            });

            const analysisData = await response.json();

            if (analysisData.status === 'success') {
                console.log(`✅ Analysis completed for ${databaseName}`);
                console.log(`📊 Graph: ${analysisData.node_count} nodes, ${analysisData.edge_count} edges`);
                console.log(`🚗 Entities: ${analysisData.vehicle_count} vehicles, ${analysisData.area_count} areas`);
                if (analysisData.military_unit_count !== undefined) {
                    console.log(`🪖 Military Units: ${analysisData.military_unit_count} units`);
                }
                
                // Update our tracking
                this.lastAnalysisTime[databaseName] = Date.now();
                
                return analysisData;
            } else {
                throw new Error(analysisData.message || 'Analysis failed');
            }

        } catch (error) {
            console.error(`❌ Error during analysis:`, error);
            throw error;
        }
    }

    /**
     * Enhanced country comparison with fresh data
     */
    async runCountryComparisonWithFreshData(countries, databases = null, options = {}) {
        try {
            console.log(`🌍 Running country comparison for: ${countries.join(', ')}`);
            
            const response = await fetch(`${this.baseUrl}/api/compare_countries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    countries: countries,
                    databases: databases,
                    force_reload: true,
                    ...options
                })
            });

            const comparisonData = await response.json();

            if (comparisonData.status === 'success') {
                console.log(`✅ Country comparison completed`);
                return comparisonData;
            } else {
                throw new Error(comparisonData.message || 'Country comparison failed');
            }

        } catch (error) {
            console.error(`❌ Error during country comparison:`, error);
            throw error;
        }
    }

    /**
     * Enhanced comprehensive report with fresh data
     */
    async generateComprehensiveReportWithFreshData(databases = null) {
        try {
            console.log(`📊 Generating comprehensive report`);
            
            const params = new URLSearchParams({
                force_reload: 'true'
            });
            
            if (databases && databases.length > 0) {
                databases.forEach(db => params.append('databases', db));
            }

            const response = await fetch(`${this.baseUrl}/api/comprehensive_report?${params}`);
            const reportData = await response.json();

            if (reportData.status === 'success') {
                console.log(`✅ Comprehensive report generated`);
                return reportData;
            } else {
                throw new Error(reportData.message || 'Report generation failed');
            }

        } catch (error) {
            console.error(`❌ Error generating comprehensive report:`, error);
            throw error;
        }
    }
}

// Global instance
window.databaseManager = new DatabaseManager();

// Enhanced UI functions (replace your existing ones with these)
window.enhancedUIFunctions = {
    
    /**
     * Enhanced Run Analysis button handler
     */
    async runAnalysis() {
        const databaseSelect = document.getElementById('database-select');
        const layoutSelect = document.getElementById('layout-select');
        const labelsCheckbox = document.getElementById('show-labels');
        const resultsDiv = document.getElementById('analysis-results');
        const loadingDiv = document.getElementById('loading');

        if (!databaseSelect || !databaseSelect.value) {
            alert('Please select a database first');
            return;
        }

        const databaseName = databaseSelect.value;
        const layout = layoutSelect ? layoutSelect.value : 'spring';
        const showLabels = labelsCheckbox ? labelsCheckbox.checked : true;

        // Show loading
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
            loadingDiv.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>🔄 Ensuring fresh data and running analysis...</p>
                    <p><small>This may take a moment to reload data from disk</small></p>
                </div>
            `;
        }

        // Clear previous results
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
        }

        try {
            // Get current filters
            const filters = this.getCurrentFilters();
            
            // Run analysis with fresh data
            const result = await window.databaseManager.runAnalysisWithFreshData(databaseName, {
                layout: layout,
                show_labels: showLabels,
                filters: filters
            });

            // Hide loading
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            // Display results
            this.displayAnalysisResults(result, resultsDiv);

        } catch (error) {
            console.error('Analysis failed:', error);
            
            // Hide loading
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            // Show error
            if (resultsDiv) {
                resultsDiv.innerHTML = `
                    <div class="error-message">
                        <h3>❌ Analysis Failed</h3>
                        <p>${error.message}</p>
                        <p><small>Check the console for more details</small></p>
                    </div>
                `;
            } else {
                alert(`Analysis failed: ${error.message}`);
            }
        }
    },

    /**
     * Get current filter values from the UI
     */
    getCurrentFilters() {
        const filters = {};
        
        // Add your filter collection logic here based on your UI elements
        // Example:
        const countryFilter = document.getElementById('country-filter');
        if (countryFilter && countryFilter.value) {
            filters.country = countryFilter.value;
        }

        const typeFilter = document.getElementById('type-filter');
        if (typeFilter && typeFilter.value) {
            filters.type = typeFilter.value;
        }

        return filters;
    },

    /**
     * Display analysis results in the UI
     */
    displayAnalysisResults(result, container) {
        if (!container) return;

        const html = `
            <div class="analysis-results">
                <div class="results-header">
                    <h3>✅ Analysis Complete</h3>
                    <div class="stats-summary">
                        <span class="stat-item">📊 ${result.node_count} nodes</span>
                        <span class="stat-item">🔗 ${result.edge_count} edges</span>
                        <span class="stat-item">🚗 ${result.vehicle_count} vehicles</span>
                        <span class="stat-item">📍 ${result.area_count} areas</span>
                        ${result.military_unit_count !== undefined ? `<span class="stat-item">🪖 ${result.military_unit_count} military units</span>` : ''}
                    </div>
                </div>
                
                <div class="visualization-container">
                    <div id="plotly-visualization"></div>
                </div>
                
                <div class="analysis-metadata">
                    <small>
                        ${result.force_reloaded ? '🔄 Data reloaded from disk' : '💾 Used cached data'} | 
                        Analysis completed at ${new Date().toLocaleTimeString()}
                    </small>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Render the Plotly visualization
        if (result.visualization && window.Plotly) {
            const vizContainer = document.getElementById('plotly-visualization');
            if (vizContainer) {
                window.Plotly.newPlot(vizContainer, result.visualization.data, result.visualization.layout);
            }
        }
    },

    /**
     * Enhanced Compare Countries button handler
     */
    async compareCountries() {
        const countriesSelect = document.getElementById('countries-select');
        const databasesSelect = document.getElementById('databases-select');
        const resultsDiv = document.getElementById('comparison-results');
        const loadingDiv = document.getElementById('loading');

        // Get selected countries and databases
        const countries = Array.from(countriesSelect.selectedOptions).map(option => option.value);
        const databases = databasesSelect ? Array.from(databasesSelect.selectedOptions).map(option => option.value) : null;

        if (countries.length === 0) {
            alert('Please select at least one country to compare');
            return;
        }

        // Show loading
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
            loadingDiv.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>🌍 Comparing countries with fresh data...</p>
                </div>
            `;
        }

        try {
            const result = await window.databaseManager.runCountryComparisonWithFreshData(countries, databases);
            
            // Hide loading and display results
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            this.displayComparisonResults(result, resultsDiv);

        } catch (error) {
            console.error('Country comparison failed:', error);
            
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            if (resultsDiv) {
                resultsDiv.innerHTML = `
                    <div class="error-message">
                        <h3>❌ Country Comparison Failed</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Display comparison results
     */
    displayComparisonResults(result, container) {
        if (!container || !result.comparison) return;

        // Implement your comparison results display logic here
        container.innerHTML = `
            <div class="comparison-results">
                <h3>🌍 Country Comparison Results</h3>
                <div class="comparison-data">
                    ${JSON.stringify(result.comparison, null, 2)}
                </div>
            </div>
        `;
    }
};

// Auto-bind enhanced functions to buttons when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Bind Run Analysis button
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', window.enhancedUIFunctions.runAnalysis.bind(window.enhancedUIFunctions));
    }

    // Bind Compare Countries button
    const compareBtn = document.getElementById('compare-countries-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', window.enhancedUIFunctions.compareCountries.bind(window.enhancedUIFunctions));
    }

    // Add refresh data button if it doesn't exist
    const existingRefreshBtn = document.getElementById('refresh-data-btn');
    if (!existingRefreshBtn) {
        const controlsContainer = document.querySelector('.controls') || document.querySelector('.button-container');
        if (controlsContainer) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refresh-data-btn';
            refreshBtn.className = 'btn btn-secondary';
            refreshBtn.innerHTML = '🔄 Refresh Data';
            refreshBtn.addEventListener('click', async function() {
                const databaseSelect = document.getElementById('database-select');
                if (databaseSelect && databaseSelect.value) {
                    await window.databaseManager.forceReloadDatabase(databaseSelect.value);
                    alert('✅ Database refreshed from disk');
                } else {
                    alert('Please select a database first');
                }
            });
            controlsContainer.appendChild(refreshBtn);
        }
    }
});

// Add some basic CSS for the loading spinner and results
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        text-align: center;
        padding: 20px;
    }
    
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 2s linear infinite;
        margin: 0 auto 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .stats-summary {
        display: flex;
        gap: 15px;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    
    .stat-item {
        background: #f0f0f0;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 14px;
    }
    
    .error-message {
        background: #ffebee;
        border: 1px solid #f44336;
        border-radius: 5px;
        padding: 15px;
        margin: 10px 0;
        color: #c62828;
    }
    
    .analysis-metadata {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #eee;
        color: #666;
    }
`;
document.head.appendChild(style);

console.log('🚀 Enhanced database manager loaded - Run Analysis will now always use fresh data!');