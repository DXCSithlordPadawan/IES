"""
Web Interface for IES4 Military Database Analysis Suite
Flask-based web interface for interactive analysis and visualization.
"""

from flask import Flask, render_template, request, jsonify, send_file
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import tempfile
import os

logger = logging.getLogger(__name__)

def create_app(analyzer=None):
    """Create and configure the Flask application."""
    app = Flask(__name__, 
                template_folder='templates',  # Use enhanced templates with filtering
                static_folder='static')
    
    app.config['SECRET_KEY'] = 'ies4-military-analysis-secret-key'
    
    if analyzer:
        app.analyzer = analyzer
    
    return app

def launch_web_interface(analyzer, host='127.0.0.1', port=8080, debug=True):
    """Launch the web interface."""
    app = create_app(analyzer)
    
    # Ensure templates directory exists
    templates_dir = Path('src/templates')
    if not templates_dir.exists():
        templates_dir.mkdir(exist_ok=True)
        logger.warning(f"Created missing templates directory: {templates_dir}")
    
    @app.route('/')
    def index():
        """Main dashboard page."""
        return render_template('index.html')
    
    @app.route('/api/databases')
    def get_databases():
        """Get list of available databases."""
        try:
            databases = list(analyzer.DATABASE_CONFIGS.keys())
            loaded_databases = list(analyzer.databases.keys())
            
            return jsonify({
                'available': databases,
                'loaded': loaded_databases,
                'status': 'success'
            })
        except Exception as e:
            logger.error(f"Error getting databases: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/load_database', methods=['POST'])
    def load_database():
        """Load a specific database."""
        try:
            data = request.get_json()
            
            # Handle loading all databases
            if data.get('load_all'):
                analyzer.load_all_databases()
                return jsonify({
                    'status': 'success',
                    'message': f'Loaded {len(analyzer.databases)} databases',
                    'loaded_databases': list(analyzer.databases.keys())
                })
            
            database_name = data.get('database_name')
            if not database_name:
                return jsonify({'status': 'error', 'message': 'Database name required'}), 400
            
            # Force reload: remove from memory first if it exists
            if database_name in analyzer.databases:
                logger.info(f"Force reloading database: {database_name}")
                del analyzer.databases[database_name]
            
            # Clear combined graph to force rebuild
            analyzer.combined_graph = None
            
            # Load the database fresh from file
            database = analyzer.load_database(database_name)
            
            return jsonify({
                'status': 'success',
                'message': f'Loaded database: {database_name}',
                'entity_counts': database.get('_metadata', {}).get('entity_counts', {}),
                'force_reloaded': True
            })
            
        except Exception as e:
            logger.error(f"Error loading database: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/force_reload_database', methods=['POST'])
    def force_reload_database():
        """Force reload a database from disk, bypassing any cache."""
        try:
            data = request.get_json()
            database_name = data.get('database_name')
            
            if not database_name:
                return jsonify({'status': 'error', 'message': 'Database name required'}), 400
            
            logger.info(f"Force reloading database from disk: {database_name}")
            
            # Remove from memory if exists
            if database_name in analyzer.databases:
                del analyzer.databases[database_name]
            
            # Clear any cached graphs
            analyzer.combined_graph = None
            
            # Force reload from file
            database = analyzer.load_database(database_name)
            
            # Get file modification time for verification
            if database_name in analyzer.DATABASE_CONFIGS:
                file_path = analyzer.data_dir / analyzer.DATABASE_CONFIGS[database_name]
                if file_path.exists():
                    mod_time = file_path.stat().st_mtime
                else:
                    mod_time = None
            else:
                mod_time = None
            
            return jsonify({
                'status': 'success',
                'message': f'Force reloaded database: {database_name}',
                'entity_counts': database.get('_metadata', {}).get('entity_counts', {}),
                'file_mod_time': mod_time,
                'timestamp': analyzer.loader.last_load_time if hasattr(analyzer.loader, 'last_load_time') else None
            })
            
        except Exception as e:
            logger.error(f"Error force reloading database: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/analyze', methods=['POST'])
    def analyze_database():
        """Analyze a database and return visualization."""
        try:
            data = request.get_json()
            database_name = data.get('database_name')
            layout_type = data.get('layout', 'spring')
            filters = data.get('filters', {})
            show_labels = data.get('show_labels', True)
            force_reload = data.get('force_reload', True)  # Default to force reload
            
            if not database_name:
                return jsonify({'status': 'error', 'message': 'Database name required'}), 400
            
            logger.info(f"Analyzing database: {database_name} (force_reload={force_reload})")
            
            # Force reload the database to get latest data
            if force_reload:
                logger.info(f"Force reloading {database_name} before analysis")
                if database_name in analyzer.databases:
                    del analyzer.databases[database_name]
                analyzer.combined_graph = None
                analyzer.load_database(database_name)
            
            # Ensure database is loaded
            if database_name not in analyzer.databases:
                analyzer.load_database(database_name)
            
            # Perform analysis with fresh data
            result = analyzer.analyze_single_database(
                database_name,
                layout=layout_type,
                filters=filters,
                export_stats=True,
                show_labels=show_labels
            )
            
            # Convert figure to JSON
            fig_json = result['visualization'].to_json()
            
            # Get additional metadata
            database = analyzer.databases[database_name]
            vehicle_count = len(database.get('vehicles', []))
            area_count = len(database.get('areas', []))
            
            return jsonify({
                'status': 'success',
                'visualization': json.loads(fig_json),
                'statistics': result['statistics'],
                'node_count': len(result['graph'].nodes),
                'edge_count': len(result['graph'].edges),
                'vehicle_count': vehicle_count,
                'area_count': area_count,
                'force_reloaded': force_reload,
                'analysis_timestamp': analyzer.loader.last_load_time if hasattr(analyzer.loader, 'last_load_time') else None
            })
            
        except Exception as e:
            logger.error(f"Error analyzing database: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/compare_countries', methods=['POST'])
    def compare_countries():
        """Compare countries across databases."""
        try:
            data = request.get_json()
            countries = data.get('countries', ['uk', 'usa', 'russia', 'poland', 'iran', 'sweden','finland'])
            databases = data.get('databases', None)
            force_reload = data.get('force_reload', True)
            
            # Force reload databases if requested
            if force_reload and databases:
                logger.info("Force reloading databases for comparison")
                for db_name in databases:
                    if db_name in analyzer.databases:
                        del analyzer.databases[db_name]
                analyzer.combined_graph = None
            
            # Ensure we have loaded databases
            if not analyzer.databases:
                analyzer.load_all_databases()
            
            # Perform comparison
            comparison = analyzer.compare_countries(databases, countries)
            
            return jsonify({
                'status': 'success',
                'comparison': comparison,
                'force_reloaded': force_reload
            })
            
        except Exception as e:
            logger.error(f"Error comparing countries: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/comprehensive_report')
    def comprehensive_report():
        """Generate comprehensive analysis report."""
        try:
            databases = request.args.getlist('databases')
            force_reload = request.args.get('force_reload', 'true').lower() == 'true'
            
            # Force reload databases if requested
            if force_reload:
                logger.info("Force reloading all databases for comprehensive report")
                analyzer.databases.clear()
                analyzer.combined_graph = None
            
            # Ensure we have loaded databases
            if not analyzer.databases:
                logger.info("No databases loaded, loading all available databases...")
                try:
                    analyzer.load_all_databases()
                    logger.info(f"Loaded {len(analyzer.databases)} databases for comprehensive report")
                except Exception as e:
                    logger.error(f"Failed to load databases: {e}")
                    # Try to load at least one database as fallback
                    fallback_dbs = ['combined', 'usa', 'uk', 'OP7']
                    for fallback_db in fallback_dbs:
                        try:
                            analyzer.load_database(fallback_db)
                            logger.info(f"Loaded fallback database: {fallback_db}")
                            break
                        except Exception as fallback_error:
                            logger.warning(f"Failed to load fallback database {fallback_db}: {fallback_error}")
                            continue
                    
                    if not analyzer.databases:
                        return jsonify({
                            'status': 'error',
                            'message': 'No databases could be loaded. Please check your data directory.'
                        }), 500
            
            if not databases:
                databases = list(analyzer.databases.keys())
            
            # Check if we have valid databases to analyze
            if not databases:
                return jsonify({
                    'status': 'error',
                    'message': 'No databases available for analysis'
                }), 400
            
            # Generate report
            report = analyzer.generate_comprehensive_report(databases)
            
            # Ensure report has basic structure for dashboard
            if not report:
                report = {
                    'database_summary': {},
                    'executive_summary': {
                        'total_entities': 0,
                        'total_relationships': 0,
                        'databases_analyzed': len(databases)
                    }
                }
            
            # Add database summary if missing
            if 'database_summary' not in report:
                report['database_summary'] = {}
                for db_name in databases:
                    if db_name in analyzer.databases:
                        db_data = analyzer.databases[db_name]
                        entity_counts = {}
                        for entity_type in ['vehicles', 'areas', 'organizations', 'persons', 'weapons']:
                            if entity_type in db_data and isinstance(db_data[entity_type], list):
                                entity_counts[entity_type] = len(db_data[entity_type])
                        
                        report['database_summary'][db_name] = {
                            'entity_counts': entity_counts,
                            'total_entities': sum(entity_counts.values()),
                            'relationship_count': 0  # Placeholder
                        }
            
            return jsonify({
                'status': 'success',
                'report': report,
                'force_reloaded': force_reload,
                'databases_analyzed': len(databases)
            })
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'status': 'error', 
                'message': f'Report generation failed: {str(e)}'
            }), 500
    
    @app.route('/api/check_file_status')
    def check_file_status():
        """Check the modification time and status of database files."""
        try:
            database_name = request.args.get('database')
            if not database_name:
                return jsonify({'status': 'error', 'message': 'Database name required'}), 400
            
            if database_name not in analyzer.DATABASE_CONFIGS:
                return jsonify({'status': 'error', 'message': 'Unknown database'}), 400
            
            file_path = analyzer.data_dir / analyzer.DATABASE_CONFIGS[database_name]
            
            if not file_path.exists():
                return jsonify({
                    'status': 'error', 
                    'message': f'Database file not found: {file_path}'
                }), 404
            
            # Get file stats
            stat_info = file_path.stat()
            
            # Check if database is loaded in memory
            is_loaded = database_name in analyzer.databases
            
            # Get entity counts from file
            try:
                with open(file_path, 'r') as f:
                    file_data = json.load(f)
                file_vehicle_count = len(file_data.get('vehicles', []))
                file_area_count = len(file_data.get('areas', []))
            except Exception as e:
                logger.error(f"Error reading file for stats: {e}")
                file_vehicle_count = 0
                file_area_count = 0
            
            # Get entity counts from memory if loaded
            memory_vehicle_count = 0
            memory_area_count = 0
            if is_loaded:
                db = analyzer.databases[database_name]
                memory_vehicle_count = len(db.get('vehicles', []))
                memory_area_count = len(db.get('areas', []))
            
            return jsonify({
                'status': 'success',
                'database_name': database_name,
                'file_path': str(file_path),
                'file_mod_time': stat_info.st_mtime,
                'file_size': stat_info.st_size,
                'is_loaded_in_memory': is_loaded,
                'file_entity_counts': {
                    'vehicles': file_vehicle_count,
                    'areas': file_area_count
                },
                'memory_entity_counts': {
                    'vehicles': memory_vehicle_count,
                    'areas': memory_area_count
                } if is_loaded else None,
                'data_sync_status': 'synced' if (file_vehicle_count == memory_vehicle_count and file_area_count == memory_area_count) or not is_loaded else 'out_of_sync'
            })
            
        except Exception as e:
            logger.error(f"Error checking file status: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/filter_suggestions')
    def get_filter_suggestions():
        """Get filter suggestions based on loaded data."""
        try:
            database_name = request.args.get('database')
            force_reload = request.args.get('force_reload', 'false').lower() == 'true'
            
            if database_name and database_name in analyzer.databases:
                # Force reload if requested
                if force_reload:
                    if database_name in analyzer.databases:
                        del analyzer.databases[database_name]
                    analyzer.load_database(database_name)
                
                # Build graph for the specific database
                database = analyzer.databases[database_name]
                graph = analyzer.graph_builder.build_graph(database)
                suggestions = analyzer.filter_system.get_filter_suggestions(graph)
            else:
                # Use combined graph if available
                if analyzer.combined_graph and not force_reload:
                    suggestions = analyzer.filter_system.get_filter_suggestions(analyzer.combined_graph)
                else:
                    # Build a combined graph from all loaded databases
                    if analyzer.databases:
                        analyzer.build_combined_graph()
                        suggestions = analyzer.filter_system.get_filter_suggestions(analyzer.combined_graph)
                    else:
                        # Provide default suggestions if no databases are loaded
                        suggestions = {
                            'countries': ['uk', 'usa', 'russia', 'poland', 'iran', 'sweden', 'finland', 'china', 'germany', 'france', 'north_korea'],
                            'types': ['country', 'weapon', 'organization', 'vehicle', 'person', 'area', 'militaryOrganization'],
                            'years': ['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2025'],
                            'manufacturers': ['Lockheed Martin', 'Boeing', 'BAE Systems', 'Raytheon', 'General Dynamics'],
                            'vehicle_types': ['aircraft', 'tank', 'ship', 'submarine', 'helicopter'],
                            'organization_types': ['military', 'defense', 'government'],
                            'area_types': ['administrative', 'military', 'geographic'],
                            'relationships': ['owns', 'manufactures', 'located_in', 'operated_by'],
                            'equipment_categories': list(analyzer.filter_system.equipment_categories.keys())
                        }
            
            return jsonify({
                'status': 'success',
                'suggestions': suggestions,
                'force_reloaded': force_reload
            })
            
        except Exception as e:
            logger.error(f"Error getting filter suggestions: {e}")
            # Provide fallback suggestions on error
            fallback_suggestions = {
                'countries': ['uk', 'usa', 'russia', 'poland', 'iran', 'sweden', 'finland'],
                'types': ['country', 'weapon', 'organization', 'vehicle', 'person', 'area', 'militaryOrganization'],
                'years': [],
                'manufacturers': [],
                'vehicle_types': [],
                'organization_types': [],
                'area_types': [],
                'relationships': [],
                'equipment_categories': list(analyzer.filter_system.equipment_categories.keys()) if hasattr(analyzer.filter_system, 'equipment_categories') else []
            }
            return jsonify({
                'status': 'success', 
                'suggestions': fallback_suggestions,
                'force_reloaded': force_reload,
                'fallback': True
            })
    
    @app.route('/api/dashboard_data')
    def get_dashboard_data():
        """Get basic dashboard data without full comprehensive report."""
        try:
            # Ensure we have at least one database loaded
            if not analyzer.databases:
                logger.info("Loading databases for dashboard data...")
                try:
                    # Try to load key databases
                    key_dbs = ['OP7', 'usa', 'uk']
                    for db_name in key_dbs:
                        try:
                            analyzer.load_database(db_name)
                            break
                        except:
                            continue
                except Exception as e:
                    logger.error(f"Failed to load any databases: {e}")
            
            # Generate basic dashboard data
            dashboard_data = {
                'database_summary': {},
                'total_entities': 0,
                'total_databases': len(analyzer.databases),
                'status': 'success'
            }
            
            # Collect data from loaded databases
            for db_name, db_data in analyzer.databases.items():
                entity_counts = {}
                total_entities = 0
                
                # Count entities by type
                for entity_type in ['vehicles', 'areas', 'organizations', 'persons', 'weapons']:
                    if entity_type in db_data and isinstance(db_data[entity_type], list):
                        count = len(db_data[entity_type])
                        entity_counts[entity_type] = count
                        total_entities += count
                
                dashboard_data['database_summary'][db_name] = {
                    'entity_counts': entity_counts,
                    'total_entities': total_entities
                }
                
                dashboard_data['total_entities'] += total_entities
            
            return jsonify(dashboard_data)
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {e}")
            return jsonify({
                'status': 'error',
                'message': str(e),
                'database_summary': {},
                'total_entities': 0,
                'total_databases': 0
            })
    
    @app.route('/api/equipment_categories')
    def get_equipment_categories():
        """Get available equipment categories for filtering."""
        try:
            category_info = analyzer.filter_system.get_equipment_category_info()
            return jsonify({
                'status': 'success',
                'categories': category_info
            })
        except Exception as e:
            logger.error(f"Error getting equipment categories: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/export/<format>')
    def export_data(format):
        """Export data in specified format."""
        try:
            database_name = request.args.get('database')
            force_reload = request.args.get('force_reload', 'true').lower() == 'true'
            
            # If no specific database, use first available
            if not database_name and analyzer.databases:
                database_name = list(analyzer.databases.keys())[0]
            
            if not database_name or database_name not in analyzer.databases:
                return jsonify({'status': 'error', 'message': 'No valid database available'}), 400
            
            # Force reload if requested
            if force_reload:
                if database_name in analyzer.databases:
                    del analyzer.databases[database_name]
                analyzer.load_database(database_name)
            
            # Build graph
            database = analyzer.databases[database_name]
            graph = analyzer.graph_builder.build_graph(database)
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=f'.{format}') as temp_file:
                if format == 'csv':
                    analyzer.statistics_generator.export_to_csv(graph, temp_file.name)
                elif format == 'json':
                    stats = analyzer.statistics_generator.generate_statistics(graph, database)
                    json.dump(stats, temp_file, indent=2, default=str)
                else:
                    return jsonify({'status': 'error', 'message': 'Unsupported format'}), 400
                
                temp_filename = temp_file.name
            
            # Send file
            return send_file(
                temp_filename,
                as_attachment=True,
                download_name=f'{database_name}_export.{format}',
                mimetype='application/octet-stream'
            )
            
        except Exception as e:
            logger.error(f"Error exporting data: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/api/entity/<entity_id>')
    def get_entity_details(entity_id):
        """Get detailed information about a specific entity."""
        try:
            database_name = request.args.get('database')
            if not database_name:
                return jsonify({'status': 'error', 'message': 'Database name required'}), 400
            
            # Ensure database is loaded
            if database_name not in analyzer.databases:
                try:
                    analyzer.load_database(database_name)
                except Exception as e:
                    return jsonify({'status': 'error', 'message': f'Database {database_name} not found'}), 404
            
            database = analyzer.databases[database_name]
            
            # Search through different entity types
            entity_types = ['vehicles', 'areas', 'people', 'countries', 'militaryOrganizations', 'vehicleTypes', 'peopleTypes']
            
            for entity_type in entity_types:
                if entity_type in database and isinstance(database[entity_type], list):
                    for entity in database[entity_type]:
                        if entity.get('id') == entity_id:
                            # Add entity type information
                            entity_with_type = dict(entity)
                            entity_with_type['entityType'] = entity_type
                            return jsonify({
                                'status': 'success',
                                'entity': entity_with_type
                            })
            
            # If not found in main entity types, search in other sections
            def search_recursive(obj, target_id):
                if isinstance(obj, dict):
                    if obj.get('id') == target_id:
                        return obj
                    for value in obj.values():
                        result = search_recursive(value, target_id)
                        if result:
                            return result
                elif isinstance(obj, list):
                    for item in obj:
                        result = search_recursive(item, target_id)
                        if result:
                            return result
                return None
            
            # Deep search in the database
            found_entity = search_recursive(database, entity_id)
            if found_entity:
                return jsonify({
                    'status': 'success',
                    'entity': found_entity
                })
            
            return jsonify({'status': 'error', 'message': f'Entity {entity_id} not found'}), 404
            
        except Exception as e:
            logger.error(f"Error fetching entity details: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    @app.route('/dashboard')
    def dashboard():
        """Dashboard page with automatic database loading."""
        # Ensure at least some databases are loaded for the dashboard
        if not analyzer.databases:
            logger.info("Dashboard accessed with no databases loaded, attempting to load...")
            try:
                # Try to load some key databases for dashboard
                key_databases = ['OP7', 'usa', 'uk', 'combined']
                loaded_count = 0
                for db_name in key_databases:
                    try:
                        analyzer.load_database(db_name)
                        loaded_count += 1
                        logger.info(f"Loaded {db_name} for dashboard")
                        if loaded_count >= 1:  # At least one database loaded
                            break
                    except Exception as e:
                        logger.warning(f"Could not load {db_name}: {e}")
                        continue
                
                if loaded_count == 0:
                    logger.warning("No databases could be loaded for dashboard")
                else:
                    logger.info(f"Dashboard ready with {loaded_count} database(s)")
                    
            except Exception as e:
                logger.error(f"Error preparing dashboard: {e}")
        
        return render_template('dashboard.html')
    
    @app.route('/comparison')
    def comparison():
        """Country comparison page."""
        return render_template('comparison.html')
    
    @app.route('/analysis')
    def analysis():
        """Detailed analysis page."""
        return render_template('analysis.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return render_template('error.html', error='Page not found'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return render_template('error.html', error='Internal server error'), 500
    
    logger.info(f"Starting web interface on http://{host}:{port}")
    logger.info("Make sure the 'templates' directory exists in the same directory as this script")
    
    # Check if templates exist and provide helpful error message
    required_templates = ['index.html', 'dashboard.html', 'analysis.html', 'comparison.html', 'error.html']
    missing_templates = []
    
    for template in required_templates:
        template_path = Path('templates') / template
        if not template_path.exists():
            missing_templates.append(template)
    
    if missing_templates:
        logger.error(f"Missing template files: {missing_templates}")
        logger.error("Please create the templates directory and add the missing template files")
        logger.error("The web interface may not work correctly without these templates")
    
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    # For standalone testing
    from military_database_analyzer_v3 import MilitaryDatabaseAnalyzer
    analyzer = MilitaryDatabaseAnalyzer()
    launch_web_interface(analyzer)