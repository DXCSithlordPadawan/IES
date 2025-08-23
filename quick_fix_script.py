#!/usr/bin/env python3
"""
Quick fix script to create minimal templates for the web interface
Run this in the same directory as your military_database_analyzer_v3.py file
"""

import os
from pathlib import Path

def create_minimal_templates():
    """Create minimal working templates"""
    
    # Get the current working directory
    current_dir = Path.cwd()
    templates_dir = current_dir / "templates"
    
    print(f"Current directory: {current_dir}")
    print(f"Creating templates in: {templates_dir}")
    
    # Create templates directory
    templates_dir.mkdir(exist_ok=True)
    
    # Minimal templates that will work
    templates = {
        'index.html': '''<!DOCTYPE html>
<html>
<head>
    <title>IES4 Military Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">IES4 Military Analysis</a>
            <div>
                <a href="/" class="text-light me-3">Home</a>
                <a href="/dashboard" class="text-light me-3">Dashboard</a>
                <a href="/analysis" class="text-light me-3">Analysis</a>
                <a href="/comparison" class="text-light">Comparison</a>
            </div>
        </div>
    </nav>
    <div class="container mt-4">
        <h1>Military Database Analysis Suite</h1>
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Dashboard</h5>
                        <p>View comprehensive analysis</p>
                        <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Analysis</h5>
                        <p>Interactive network analysis</p>
                        <a href="/analysis" class="btn btn-success">Start Analysis</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5>Comparison</h5>
                        <p>Compare countries</p>
                        <a href="/comparison" class="btn btn-warning">Compare</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>''',

        'dashboard.html': '''<!DOCTYPE html>
<html>
<head>
    <title>Dashboard - IES4 Military Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">IES4 Military Analysis</a>
        </div>
    </nav>
    <div class="container mt-4">
        <h1>Dashboard</h1>
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5>System Status</h5>
                        <p>Dashboard is working. Check console for database status.</p>
                        <button class="btn btn-primary" onclick="loadReport()">Load Report</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        function loadReport() {
            fetch('/api/comprehensive_report')
                .then(response => response.json())
                .then(data => alert('Report loaded: ' + data.status))
                .catch(error => alert('Error: ' + error));
        }
    </script>
</body>
</html>''',

        'analysis.html': '''<!DOCTYPE html>
<html>
<head>
    <title>Analysis - IES4 Military Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">IES4 Military Analysis</a>
        </div>
    </nav>
    <div class="container mt-4">
        <h1>Analysis</h1>
        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5>Database Selection</h5>
                        <select class="form-select mb-3" id="databaseSelect">
                            <option value="">Loading...</option>
                        </select>
                        <button class="btn btn-primary" onclick="runAnalysis()">Analyze</button>
                    </div>
                </div>
            </div>
            <div class="col-md-9">
                <div class="card">
                    <div class="card-body">
                        <h5>Visualization</h5>
                        <div id="visualization" style="height: 500px; border: 1px solid #ddd;">
                            <p class="text-center mt-5">Select a database and click Analyze</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        // Load databases
        fetch('/api/databases')
            .then(response => response.json())
            .then(data => {
                const select = document.getElementById('databaseSelect');
                select.innerHTML = '<option value="">Select database...</option>';
                data.available.forEach(db => {
                    const option = document.createElement('option');
                    option.value = db;
                    option.textContent = db;
                    select.appendChild(option);
                });
            });

        function runAnalysis() {
            const db = document.getElementById('databaseSelect').value;
            if (!db) {
                alert('Please select a database');
                return;
            }
            
            document.getElementById('visualization').innerHTML = '<p class="text-center mt-5">Analyzing...</p>';
            
            fetch('/api/analyze', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({database_name: db})
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Plotly.newPlot('visualization', data.visualization.data, data.visualization.layout);
                } else {
                    document.getElementById('visualization').innerHTML = '<p class="text-danger">Error: ' + data.message + '</p>';
                }
            })
            .catch(error => {
                document.getElementById('visualization').innerHTML = '<p class="text-danger">Error: ' + error + '</p>';
            });
        }
    </script>
</body>
</html>''',

        'comparison.html': '''<!DOCTYPE html>
<html>
<head>
    <title>Comparison - IES4 Military Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">IES4 Military Analysis</a>
        </div>
    </nav>
    <div class="container mt-4">
        <h1>Country Comparison</h1>
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5>Select Countries</h5>
                        <div class="row">
                            <div class="col-md-3">
                                <select class="form-select" id="country1">
                                    <option value="UK">United Kingdom</option>
                                    <option value="USA">United States</option>
                                    <option value="Russia">Russia</option>
                                    <option value="China">China</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="country2">
                                    <option value="USA">United States</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="Russia">Russia</option>
                                    <option value="China">China</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-primary" onclick="compare()">Compare</button>
                            </div>
                        </div>
                        <div id="comparison-result" style="height: 400px; margin-top: 20px;">
                            <p class="text-center">Select countries and click Compare</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        function compare() {
            const c1 = document.getElementById('country1').value;
            const c2 = document.getElementById('country2').value;
            
            document.getElementById('comparison-result').innerHTML = '<p>Comparing...</p>';
            
            fetch('/api/compare_countries', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({countries: [c1, c2]})
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Simple display
                    document.getElementById('comparison-result').innerHTML = 
                        '<pre>' + JSON.stringify(data.comparison, null, 2) + '</pre>';
                } else {
                    document.getElementById('comparison-result').innerHTML = 
                        '<p class="text-danger">Error: ' + data.message + '</p>';
                }
            })
            .catch(error => {
                document.getElementById('comparison-result').innerHTML = 
                    '<p class="text-danger">Error: ' + error + '</p>';
            });
        }
    </script>
</body>
</html>''',

        'error.html': '''<!DOCTYPE html>
<html>
<head>
    <title>Error - IES4 Military Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">IES4 Military Analysis</a>
        </div>
    </nav>
    <div class="container mt-4">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body text-center">
                        <h1 class="text-danger">Error</h1>
                        <p>{{ error if error else "Something went wrong" }}</p>
                        <a href="/" class="btn btn-primary">Go Home</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>'''
    }
    
    # Write all template files
    for filename, content in templates.items():
        template_path = templates_dir / filename
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Created {template_path}")
    
    print(f"\n✅ All templates created in: {templates_dir}")
    print("\nNow try running:")
    print("python military_database_analyzer_v3.py --web")
    
    return templates_dir

if __name__ == "__main__":
    create_minimal_templates()
