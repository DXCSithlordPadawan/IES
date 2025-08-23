#!/usr/bin/env python3
"""
Template Creation Script for IES4 Military Database Analysis Suite
This script creates all the necessary HTML template files for the web interface.
"""

import os
from pathlib import Path

# Template content for each file
TEMPLATES = {
    'index.html': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IES4 Military Database Analysis Suite</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        .hero-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4rem 0;
        }
        .feature-card {
            transition: transform 0.3s ease;
            height: 100%;
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }
        .status-success { background-color: #28a745; }
        .status-warning { background-color: #ffc107; }
        .status-danger { background-color: #dc3545; }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link active" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="/analysis">Analysis</a></li>
                    <li class="nav-item"><a class="nav-link" href="/comparison">Comparison</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
        <div class="container text-center">
            <h1 class="display-4 fw-bold mb-4">Military Database Analysis Suite</h1>
            <p class="lead mb-4">Comprehensive analysis and visualization of military databases</p>
        </div>
    </section>

    <!-- Main Content -->
    <div class="container my-5">
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card feature-card h-100 border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-database fa-3x text-primary mb-3"></i>
                        <h5 class="card-title">Load Database</h5>
                        <p class="card-text">Load and explore military databases</p>
                        <a href="/dashboard" class="btn btn-primary">Get Started</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card feature-card h-100 border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-project-diagram fa-3x text-success mb-3"></i>
                        <h5 class="card-title">Interactive Analysis</h5>
                        <p class="card-text">Create network visualizations</p>
                        <a href="/analysis" class="btn btn-success">Start Analysis</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card feature-card h-100 border-0 shadow">
                    <div class="card-body text-center">
                        <i class="fas fa-chart-bar fa-3x text-warning mb-3"></i>
                        <h5 class="card-title">Country Comparison</h5>
                        <p class="card-text">Compare military capabilities</p>
                        <a href="/comparison" class="btn btn-warning">Compare</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
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
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body class="bg-light">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link active" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="/analysis">Analysis</a></li>
                    <li class="nav-item"><a class="nav-link" href="/comparison">Comparison</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-chart-line me-2"></i>
            Comprehensive Dashboard
        </h1>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Dashboard Overview</h5>
                        <p class="card-text">This dashboard provides comprehensive analysis of military databases.</p>
                        <button class="btn btn-primary" onclick="loadDashboardData()">Load Dashboard Data</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function loadDashboardData() {
            fetch('/api/comprehensive_report')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert('Dashboard data loaded successfully!');
                    } else {
                        alert('Error loading dashboard: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading dashboard');
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
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link active" href="/analysis">Analysis</a></li>
                    <li class="nav-item"><a class="nav-link" href="/comparison">Comparison</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-search me-2"></i>
            Interactive Analysis
        </h1>
        
        <div class="row">
            <div class="col-lg-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Database Selection</h5>
                        <form>
                            <div class="mb-3">
                                <label for="databaseSelect" class="form-label">Database</label>
                                <select class="form-select" id="databaseSelect">
                                    <option value="">Select database...</option>
                                </select>
                            </div>
                            <button type="button" class="btn btn-primary w-100" onclick="runAnalysis()">
                                <i class="fas fa-play me-2"></i>Run Analysis
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-lg-9">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Network Visualization</h5>
                        <div id="visualization-area" style="min-height: 500px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center;">
                            <div class="text-center">
                                <i class="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                                <p class="text-muted">Select a database and click "Run Analysis" to begin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function runAnalysis() {
            const database = document.getElementById('databaseSelect').value;
            if (!database) {
                alert('Please select a database');
                return;
            }
            
            const vizArea = document.getElementById('visualization-area');
            vizArea.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div><p class="mt-2">Analyzing...</p></div>';
            
            fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ database_name: database })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    vizArea.innerHTML = '';
                    Plotly.newPlot('visualization-area', data.visualization.data, data.visualization.layout);
                } else {
                    vizArea.innerHTML = '<div class="alert alert-danger">Analysis failed: ' + data.message + '</div>';
                }
            })
            .catch(error => {
                vizArea.innerHTML = '<div class="alert alert-danger">Error: ' + error.message + '</div>';
            });
        }
        
        // Load available databases
        fetch('/api/databases')
            .then(response => response.json())
            .then(data => {
                const select = document.getElementById('databaseSelect');
                data.available.forEach(db => {
                    const option = document.createElement('option');
                    option.value = db;
                    option.textContent = db.replace(/_/g, ' ').toUpperCase();
                    select.appendChild(option);
                });
            });
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
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="/analysis">Analysis</a></li>
                    <li class="nav-item"><a class="nav-link active" href="/comparison">Comparison</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container-fluid mt-4">
        <h1 class="mb-4">
            <i class="fas fa-balance-scale me-2"></i>
            Country Military Comparison
        </h1>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Select Countries to Compare</h5>
                        <form>
                            <div class="row">
                                <div class="col-md-3">
                                    <label class="form-label">Country 1</label>
                                    <select class="form-select" id="country1">
                                        <option value="UK">United Kingdom</option>
                                        <option value="USA">United States</option>
                                        <option value="Russia">Russia</option>
                                        <option value="China">China</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Country 2</label>
                                    <select class="form-select" id="country2">
                                        <option value="USA">United States</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="Russia">Russia</option>
                                        <option value="China">China</option>
                                    </select>
                                </div>
                                <div class="col-md-6 d-flex align-items-end">
                                    <button type="button" class="btn btn-primary" onclick="runComparison()">
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
                        <div class="card-body">
                            <h5 class="card-title">Comparison Results</h5>
                            <div id="comparison-chart" style="min-height: 400px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function runComparison() {
            const country1 = document.getElementById('country1').value;
            const country2 = document.getElementById('country2').value;
            
            const resultsDiv = document.getElementById('comparison-results');
            resultsDiv.style.display = 'block';
            
            fetch('/api/compare_countries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countries: [country1, country2] })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    displayComparisonResults(data.comparison);
                } else {
                    document.getElementById('comparison-chart').innerHTML = 
                        '<div class="alert alert-danger">Comparison failed: ' + data.message + '</div>';
                }
            })
            .catch(error => {
                document.getElementById('comparison-chart').innerHTML = 
                    '<div class="alert alert-danger">Error: ' + error.message + '</div>';
            });
        }
        
        function displayComparisonResults(comparison) {
            // Simple comparison chart
            const countries = Object.keys(comparison.countries || {});
            const assetCounts = countries.map(country => 
                comparison.countries[country]?.total_assets || 0
            );
            
            const data = [{
                type: 'bar',
                x: countries,
                y: assetCounts,
                marker: { color: ['#C8102E', '#002868', '#DA020E', '#DE2910'] }
            }];
            
            const layout = {
                title: 'Total Assets Comparison',
                xaxis: { title: 'Countries' },
                yaxis: { title: 'Total Assets' }
            };
            
            Plotly.newPlot('comparison-chart', data, layout);
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
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">
                <i class="fas fa-shield-alt me-2"></i>
                IES4 Military Analysis
            </a>
            <div class="collapse navbar-collapse">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="/analysis">Analysis</a></li>
                    <li class="nav-item"><a class="nav-link" href="/comparison">Comparison</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Error Content -->
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                        <h2 class="mb-3">Oops! Something went wrong</h2>
                        <p class="text-muted mb-4">{{ error if error else "An unexpected error occurred." }}</p>
                        
                        <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                            <a href="/" class="btn btn-primary">
                                <i class="fas fa-home me-2"></i>Return Home
                            </a>
                            <button class="btn btn-outline-secondary" onclick="history.back()">
                                <i class="fas fa-arrow-left me-2"></i>Go Back
                            </button>
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

def create_templates():
    """Create all template files in the templates directory."""
    # Create templates directory
    templates_dir = Path('templates')
    templates_dir.mkdir(exist_ok=True)
    
    print(f"Creating templates directory: {templates_dir.absolute()}")
    
    # Create each template file
    for filename, content in TEMPLATES.items():
        template_path = templates_dir / filename
        
        print(f"Creating template: {template_path}")
        
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Created {filename}")
    
    print(f"\n✓ All templates created successfully in {templates_dir.absolute()}")
    print("\nTemplate files created:")
    for filename in TEMPLATES.keys():
        print(f"  - templates/{filename}")
    
    print("\nYou can now run the web interface with:")
    print("python military_database_analyzer_v3.py --web")

if __name__ == '__main__':
    create_templates()