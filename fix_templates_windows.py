#!/usr/bin/env python3
"""
Fix for Windows template path issue
This script creates templates in the correct location for your Windows setup
"""

import os
from pathlib import Path

def fix_templates_for_windows():
    """Create templates in the correct location for Windows"""
    
    # Based on your error, the script is in C:\ies4-military-database-analysis\src\
    # So we need templates in C:\ies4-military-database-analysis\src\templates\
    
    current_file = Path(__file__).resolve()
    current_dir = current_file.parent
    
    print(f"Current script location: {current_file}")
    print(f"Current directory: {current_dir}")
    
    # Create templates directory in the src folder
    templates_dir = current_dir / "templates"
    print(f"Creating templates directory: {templates_dir}")
    
    templates_dir.mkdir(exist_ok=True)
    
    # Minimal working templates
    templates = {
        'index.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IES4 Military Database Analysis Suite</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/dashboard">Dashboard</a>
                <a class="nav-link" href="/analysis">Analysis</a>
                <a class="nav-link" href="/comparison">Comparison</a>
            </div>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="jumbotron bg-primary text-white p-5 rounded">
            <h1 class="display-4">Military Database Analysis Suite</h1>
            <p class="lead">Comprehensive analysis and visualization of military databases with interactive network graphs</p>
        </div>
        
        <div class="row mt-5">
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-chart-line fa-3x text-primary mb-3"></i>
                        <h5 class="card-title">Dashboard</h5>
                        <p class="card-text">View comprehensive analysis and system overview</p>
                        <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-project-diagram fa-3x text-success mb-3"></i>
                        <h5 class="card-title">Interactive Analysis</h5>
                        <p class="card-text">Create network visualizations and explore relationships</p>
                        <a href="/analysis" class="btn btn-success">Start Analysis</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-balance-scale fa-3x text-warning mb-3"></i>
                        <h5 class="card-title">Country Comparison</h5>
                        <p class="card-text">Compare military capabilities across different countries</p>
                        <a href="/comparison" class="btn btn-warning">Compare Countries</a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-info-circle me-2"></i>System Status</h5>
                    </div>
                    <div class="card-body">
                        <div id="system-status">
                            <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                            Loading system status...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Load system status
        fetch('/api/databases')
            .then(response => response.json())
            .then(data => {
                const statusDiv = document.getElementById('system-status');
                if (data.status === 'success') {
                    const loaded = data.loaded.length;
                    const available = data.available.length;
                    statusDiv.innerHTML = `
                        <div class="text-success">
                            <i class="fas fa-check-circle me-2"></i>
                            System operational - ${loaded}/${available} databases loaded
                        </div>
                    `;
                } else {
                    statusDiv.innerHTML = `
                        <div class="text-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            System error - Check console for details
                        </div>
                    `;
                }
            })
            .catch(error => {
                document.getElementById('system-status').innerHTML = `
                    <div class="text-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Connection error - Web interface running but API not responding
                    </div>
                `;
            });
    </script>
</body>
</html>''',

        'dashboard.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - IES4 Military Database Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link active" href="/dashboard">Dashboard</a>
                <a class="nav-link" href="/analysis">Analysis</a>
                <a class="nav-link" href="/comparison">Comparison</a>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-chart-line me-2"></i>
            Dashboard
        </h1>
        
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-white bg-primary">
                    <div class="card-body">
                        <h5 class="card-title">Databases</h5>
                        <h2 id="db-count">-</h2>
                        <small>Loaded databases</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-success">
                    <div class="card-body">
                        <h5 class="card-title">Status</h5>
                        <h2 id="system-status">-</h2>
                        <small>System status</small>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Quick Actions</h5>
                        <button class="btn btn-primary me-2" onclick="generateReport()">
                            <i class="fas fa-file-alt me-1"></i>Generate Report
                        </button>
                        <button class="btn btn-success me-2" onclick="loadAllDatabases()">
                            <i class="fas fa-database me-1"></i>Load All Databases
                        </button>
                        <a href="/analysis" class="btn btn-info">
                            <i class="fas fa-search me-1"></i>Start Analysis
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-database me-2"></i>Available Databases</h5>
                    </div>
                    <div class="card-body">
                        <div id="databases-list">
                            <div class="text-center">
                                <div class="spinner-border text-primary"></div>
                                <p class="mt-2">Loading databases...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', loadDashboard);
        
        function loadDashboard() {
            fetch('/api/databases')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById('db-count').textContent = data.loaded.length;
                        document.getElementById('system-status').textContent = 'OK';
                        displayDatabases(data);
                    } else {
                        document.getElementById('system-status').textContent = 'Error';
                    }
                })
                .catch(error => {
                    document.getElementById('system-status').textContent = 'Error';
                    console.error('Dashboard load error:', error);
                });
        }
        
        function displayDatabases(data) {
            const container = document.getElementById('databases-list');
            let html = '<div class="row">';
            
            data.available.forEach(db => {
                const isLoaded = data.loaded.includes(db);
                const badgeClass = isLoaded ? 'bg-success' : 'bg-secondary';
                const statusText = isLoaded ? 'Loaded' : 'Available';
                
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">${db.replace(/_/g, ' ').toUpperCase()}</h6>
                                <span class="badge ${badgeClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        function generateReport() {
            const btn = event.target;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating...';
            btn.disabled = true;
            
            fetch('/api/comprehensive_report')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert('Report generated successfully!');
                    } else {
                        alert('Error generating report: ' + data.message);
                    }
                })
                .catch(error => {
                    alert('Error: ' + error.message);
                })
                .finally(() => {
                    btn.innerHTML = '<i class="fas fa-file-alt me-1"></i>Generate Report';
                    btn.disabled = false;
                });
        }
        
        function loadAllDatabases() {
            const btn = event.target;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
            btn.disabled = true;
            
            fetch('/api/load_database', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({load_all: true})
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('All databases loaded successfully!');
                    loadDashboard(); // Refresh
                } else {
                    alert('Error loading databases: ' + data.message);
                }
            })
            .catch(error => {
                alert('Error: ' + error.message);
            })
            .finally(() => {
                btn.innerHTML = '<i class="fas fa-database me-1"></i>Load All Databases';
                btn.disabled = false;
            });
        }
    </script>
</body>
</html>''',

        'analysis.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analysis - IES4 Military Database Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/dashboard">Dashboard</a>
                <a class="nav-link active" href="/analysis">Analysis</a>
                <a class="nav-link" href="/comparison">Comparison</a>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-search me-2"></i>
            Interactive Network Analysis
        </h1>
        
        <div class="row">
            <div class="col-lg-3">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-database me-2"></i>Database Selection</h5>
                    </div>
                    <div class="card-body">
                        <form>
                            <div class="mb-3">
                                <label for="databaseSelect" class="form-label">Database</label>
                                <select class="form-select" id="databaseSelect" required>
                                    <option value="">Loading databases...</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="layoutSelect" class="form-label">Layout</label>
                                <select class="form-select" id="layoutSelect">
                                    <option value="spring">Spring Layout</option>
                                    <option value="hierarchical">Hierarchical</option>
                                    <option value="circular">Circular</option>
                                    <option value="force">Force-Directed</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="showLabels" checked>
                                    <label class="form-check-label" for="showLabels">
                                        Show Node Labels
                                    </label>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary w-100" onclick="runAnalysis()">
                                <i class="fas fa-play me-2"></i>Run Analysis
                            </button>
                        </form>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-pie me-2"></i>Quick Stats</h6>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-12 mb-2">
                                <div class="h5 text-primary" id="stat-nodes">-</div>
                                <small>Nodes</small>
                            </div>
                            <div class="col-12">
                                <div class="h5 text-success" id="stat-edges">-</div>
                                <small>Connections</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-9">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5><i class="fas fa-project-diagram me-2"></i>Network Visualization</h5>
                        <button class="btn btn-outline-primary btn-sm" onclick="exportVisualization()" style="display: none;" id="exportBtn">
                            <i class="fas fa-download me-1"></i>Export
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="visualization-area" style="height: 600px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <div class="text-center text-muted">
                                <i class="fas fa-project-diagram fa-4x mb-3"></i>
                                <h5>Network Visualization</h5>
                                <p>Select a database and click "Run Analysis" to begin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let currentVisualization = null;
        
        document.addEventListener('DOMContentLoaded', function() {
            loadAvailableDatabases();
        });
        
        function loadAvailableDatabases() {
            fetch('/api/databases')
                .then(response => response.json())
                .then(data => {
                    const select = document.getElementById('databaseSelect');
                    select.innerHTML = '<option value="">Select database...</option>';
                    
                    if (data.status === 'success') {
                        data.available.forEach(db => {
                            const option = document.createElement('option');
                            option.value = db;
                            option.textContent = db.replace(/_/g, ' ').toUpperCase();
                            if (data.loaded.includes(db)) {
                                option.textContent += ' (Loaded)';
                            }
                            select.appendChild(option);
                        });
                    }
                })
                .catch(error => {
                    console.error('Error loading databases:', error);
                    document.getElementById('databaseSelect').innerHTML = 
                        '<option value="">Error loading databases</option>';
                });
        }
        
        function runAnalysis() {
            const database = document.getElementById('databaseSelect').value;
            const layout = document.getElementById('layoutSelect').value;
            const showLabels = document.getElementById('showLabels').checked;
            
            if (!database) {
                alert('Please select a database');
                return;
            }
            
            const vizArea = document.getElementById('visualization-area');
            vizArea.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                    <h5>Analyzing ${database.replace(/_/g, ' ')}...</h5>
                    <p class="text-muted">Building network graph and applying layout</p>
                </div>
            `;
            
            const analysisData = {
                database_name: database,
                layout: layout,
                show_labels: showLabels,
                filters: {}
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
                    document.getElementById('exportBtn').style.display = 'block';
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
            const vizArea = document.getElementById('visualization-area');
            vizArea.innerHTML = '';
            vizArea.style.border = 'none';
            
            currentVisualization = data.visualization;
            
            Plotly.newPlot('visualization-area', data.visualization.data, data.visualization.layout, {
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
            });
        }
        
        function updateStats(data) {
            document.getElementById('stat-nodes').textContent = data.node_count.toLocaleString();
            document.getElementById('stat-edges').textContent = data.edge_count.toLocaleString();
        }
        
        function showError(message) {
            const vizArea = document.getElementById('visualization-area');
            vizArea.innerHTML = `
                <div class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h5>Analysis Error</h5>
                    <p>${message}</p>
                    <small class="text-muted">Check console for more details</small>
                </div>
            `;
            vizArea.style.border = '2px dashed #ddd';
        }
        
        function exportVisualization() {
            if (currentVisualization) {
                Plotly.downloadImage('visualization-area', {
                    format: 'png',
                    filename: `military_analysis_${Date.now()}`,
                    height: 800,
                    width: 1200
                });
            }
        }
    </script>
</body>
</html>''',

        'comparison.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Country Comparison - IES4 Military Database Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/dashboard">Dashboard</a>
                <a class="nav-link" href="/analysis">Analysis</a>
                <a class="nav-link active" href="/comparison">Comparison</a>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-balance-scale me-2"></i>
            Country Military Comparison
        </h1>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-flag me-2"></i>Select Countries to Compare</h5>
                    </div>
                    <div class="card-body">
                        <form>
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Country 1</label>
                                    <select class="form-select" id="country1">
                                        <option value="UK">United Kingdom</option>
                                        <option value="USA">United States</option>
                                        <option value="Russia">Russia</option>
                                        <option value="China">China</option>
                                        <option value="France">France</option>
                                        <option value="Germany">Germany</option>
                                    </select>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Country 2</label>
                                    <select class="form-select" id="country2">
                                        <option value="USA">United States</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="Russia">Russia</option>
                                        <option value="China">China</option>
                                        <option value="France">France</option>
                                        <option value="Germany">Germany</option>
                                    </select>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">Country 3 (Optional)</label>
                                    <select class="form-select" id="country3">
                                        <option value="">Select country...</option>
                                        <option value="Russia">Russia</option>
                                        <option value="China">China</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="USA">United States</option>
                                        <option value="France">France</option>
                                        <option value="Germany">Germany</option>
                                    </select>
                                </div>
                                <div class="col-md-3 mb-3 d-flex align-items-end">
                                    <button type="button" class="btn btn-primary w-100" onclick="runComparison()">
                                        <i class="fas fa-chart-bar me-2"></i>Compare Countries
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="comparison-results" style="display: none;">
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-chart-bar me-2"></i>Comparison Results</h5>
                        </div>
                        <div class="card-body">
                            <div id="comparison-chart" style="height: 500px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-table me-2"></i>Detailed Metrics</h5>
                        </div>
                        <div class="card-body">
                            <div id="detailed-metrics">
                                <!-- Will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function getSelectedCountries() {
            const countries = [];
            for (let i = 1; i <= 3; i++) {
                const select = document.getElementById(`country${i}`);
                if (select.value && !countries.includes(select.value)) {
                    countries.push(select.value);
                }
            }
            return countries;
        }
        
        function runComparison() {
            const countries = getSelectedCountries();
            
            if (countries.length < 2) {
                alert('Please select at least 2 countries to compare');
                return;
            }
            
            const resultsDiv = document.getElementById('comparison-results');
            resultsDiv.style.display = 'block';
            
            document.getElementById('comparison-chart').innerHTML = `
                <div class="text-center mt-5">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                    <h5>Comparing ${countries.join(', ')}...</h5>
                    <p class="text-muted">Analyzing data across databases</p>
                </div>
            `;
            
            const requestData = {
                countries: countries,
                databases: [] // Use all available databases
            };
            
            fetch('/api/compare_countries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    displayComparisonResults(data.comparison, countries);
                } else {
                    showComparisonError('Comparison failed: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Comparison error:', error);
                showComparisonError('Connection error during comparison');
            });
        }
        
        function displayComparisonResults(comparison, countries) {
            // Create assets comparison chart
            const countryData = comparison.countries || {};
            const assetCounts = countries.map(country => countryData[country]?.total_assets || 0);
            const colors = ['#C8102E', '#002868', '#DA020E', '#DE2910', '#228B22'];
            
            const data = [{
                type: 'bar',
                x: countries,
                y: assetCounts,
                marker: {
                    color: countries.map((country, index) => colors[index % colors.length]),
                    opacity: 0.8
                }
            }];
            
            const layout = {
                title: 'Total Military Assets Comparison',
                xaxis: { title: 'Countries' },
                yaxis: { title: 'Total Assets' },
                margin: { t: 60, b: 60, l: 60, r: 30 }
            };
            
            Plotly.newPlot('comparison-chart', data, layout, { responsive: true });
            
            // Create detailed metrics table
            createDetailedMetrics(comparison, countries);
        }
        
        function createDetailedMetrics(comparison, countries) {
            const container = document.getElementById('detailed-metrics');
            const countryData = comparison.countries || {};
            
            let html = '<div class="table-responsive">';
            html += '<table class="table table-striped table-hover">';
            html += '<thead class="table-dark"><tr><th>Metric</th>';
            
            countries.forEach(country => {
                html += `<th class="text-center">${country}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Total Assets
            html += '<tr><td><strong>Total Assets</strong></td>';
            countries.forEach(country => {
                const assets = countryData[country]?.total_assets || 0;
                html += `<td class="text-center">${assets.toLocaleString()}</td>`;
            });
            html += '</tr>';
            
            // Vehicles
            html += '<tr><td><strong>Vehicles</strong></td>';
            countries.forEach(country => {
                const vehicles = countryData[country]?.vehicles || 0;
                html += `<td class="text-center">${vehicles.toLocaleString()}</td>`;
            });
            html += '</tr>';
            
            // Organizations
            html += '<tr><td><strong>Military Organizations</strong></td>';
            countries.forEach(country => {
                const orgs = countryData[country]?.organizations || 0;
                html += `<td class="text-center">${orgs.toLocaleString()}</td>`;
            });
            html += '</tr>';
            
            // People
            html += '<tr><td><strong>Personnel Records</strong></td>';
            countries.forEach(country => {
                const people = countryData[country]?.people || 0;
                html += `<td class="text-center">${people.toLocaleString()}</td>`;
            });
            html += '</tr>';
            
            // Areas
            html += '<tr><td><strong>Areas/Facilities</strong></td>';
            countries.forEach(country => {
                const areas = countryData[country]?.areas || 0;
                html += `<td class="text-center">${areas.toLocaleString()}</td>`;
            });
            html += '</tr>';
            
            html += '</tbody></table></div>';
            
            // Add top vehicle types for each country
            html += '<div class="row mt-4">';
            countries.forEach((country, index) => {
                const data = countryData[country] || {};
                const vehicleTypes = data.vehicle_types || {};
                const topTypes = Object.entries(vehicleTypes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                html += `
                    <div class="col-md-${Math.floor(12/countries.length)} mb-3">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h6 class="mb-0">${country} - Top Vehicle Types</h6>
                            </div>
                            <div class="card-body">
                `;
                
                if (topTypes.length > 0) {
                    html += '<ul class="list-unstyled mb-0">';
                    topTypes.forEach(([type, count]) => {
                        html += `<li><strong>${type.replace(/_/g, ' ')}</strong>: ${count}</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<p class="text-muted mb-0">No vehicle data available</p>';
                }
                
                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            container.innerHTML = html;
        }
        
        function showComparisonError(message) {
            document.getElementById('comparison-chart').innerHTML = `
                <div class="text-center text-danger mt-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h5>Comparison Error</h5>
                    <p>${message}</p>
                    <small class="text-muted">Make sure databases are loaded and try again</small>
                </div>
            `;
        }
    </script>
</body>
</html>''',

        'error.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - IES4 Military Database Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Home</a>
                <a class="nav-link" href="/dashboard">Dashboard</a>
                <a class="nav-link" href="/analysis">Analysis</a>
                <a class="nav-link" href="/comparison">Comparison</a>
            </div>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow">
                    <div class="card-body text-center p-5">
                        <i class="fas fa-exclamation-triangle fa-4x text-danger mb-4"></i>
                        <h1 class="text-danger mb-3">Oops! Something went wrong</h1>
                        <p class="lead text-muted mb-4">{{ error if error else "An unexpected error occurred while processing your request." }}</p>
                        
                        <div class="d-grid gap-2 d-md-flex justify-content-md-center mb-4">
                            <a href="/" class="btn btn-primary">
                                <i class="fas fa-home me-2"></i>Return Home
                            </a>
                            <button class="btn btn-outline-secondary" onclick="history.back()">
                                <i class="fas fa-arrow-left me-2"></i>Go Back
                            </button>
                            <button class="btn btn-outline-info" onclick="window.location.reload()">
                                <i class="fas fa-sync-alt me-2"></i>Retry
                            </button>
                        </div>
                        
                        <div class="border-top pt-4">
                            <h5 class="text-start">Troubleshooting Tips:</h5>
                            <ul class="text-muted text-start">
                                <li>Check that all required databases are loaded</li>
                                <li>Verify your network connection</li>
                                <li>Try refreshing the page</li>
                                <li>Clear your browser cache if the problem persists</li>
                                <li>Check the console for additional error details</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>'''
    }
    
    # Write all template files
    created_files = []
    for filename, content in templates.items():
        template_path = templates_dir / filename
        try:
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(content)
            created_files.append(str(template_path))
            print(f"✓ Created: {template_path}")
        except Exception as e:
            print(f"✗ Error creating {template_path}: {e}")
    
    print(f"\n✅ Templates created successfully!")
    print(f"📁 Templates directory: {templates_dir}")
    print(f"📄 Created {len(created_files)} template files")
    
    # Also create templates in the parent directory as backup
    parent_templates = templates_dir.parent / "templates"
    if not parent_templates.exists():
        print(f"\n📁 Creating backup templates in: {parent_templates}")
        parent_templates.mkdir(exist_ok=True)
        
        for filename, content in templates.items():
            backup_path = parent_templates / filename
            try:
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ Backup: {backup_path}")
            except Exception as e:
                print(f"✗ Backup error {backup_path}: {e}")
    
    print("\n🚀 Now try running:")
    print("python military_database_analyzer_v3.py --web")
    print("\nIf it still doesn't work, also update your src/web_interface.py")
    print("and change the template_folder to 'templates' (without ../)")
    
    return templates_dir

if __name__ == "__main__":
    fix_templates_for_windows()