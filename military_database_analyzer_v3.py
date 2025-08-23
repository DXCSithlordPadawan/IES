#!/usr/bin/env python3
"""
IES4 Military Database Analysis Suite
Main application controller for analyzing military databases and generating interactive visualizations.

Author: DXCSithlordPadawan
Date: 2025-08-20
"""

import argparse
import sys
from pathlib import Path
import json
from typing import List, Dict, Optional, Union
import logging

from src.database_loader import DatabaseLoader
from src.graph_builder import GraphBuilder
from src.visualization_engine import VisualizationEngine
from src.filter_system import FilterSystem
from src.statistics_generator import StatisticsGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MilitaryDatabaseAnalyzer:
    """Main controller for military database analysis."""
    
    # Database configuration
    DATABASE_CONFIGS = {
        'combined': 'ies4_consolidated.json',
        'usa': 'ies4_usa_consolidated.json',
        'uk': 'ies4_uk_consolidated.json',
        'sweden': 'ies4_sweden_consolidated.json',
        'russia': 'ies4_russia_consolidated.json',
        'poland': 'ies4_poland_consolidated.json',
        'germany': 'ies4_germany_consolidated.json',
        'finland': 'ies4_finland_consolidated.json',
        'iran': 'ies4_iran_consolidated.json',
        'china': 'ies4_china_consolidated.json',
        'france': 'ies4_france_consolidated.json',
        'north_korea': 'ies4_north_korea_consolidated.json',
        'OP1': 'donetsk_oblast.json',
        'OP2': 'dnipropetrovsk_oblast.json',
        'OP3': 'zaporizhzhia_oblast.json',
        'OP4': 'kyiv_oblast.json',
        'OP5': 'kirovohrad_oblast.json',
        'OP6': 'mykolaiv_oblast.json',
        'OP7': 'odesa_oblast.json',
        'OP8': 'sumy_oblast.json'
    }
    
    def __init__(self, data_directory: str = "data"):
        """Initialize the analyzer with data directory."""
        self.data_dir = Path(data_directory)
        self.output_dir = Path("output")
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize components
        self.loader = DatabaseLoader(self.data_dir)
        self.graph_builder = GraphBuilder()
        self.visualization_engine = VisualizationEngine()
        self.filter_system = FilterSystem()
        self.statistics_generator = StatisticsGenerator()
        
        # Loaded databases
        self.databases = {}
        self.combined_graph = None
        
    def load_database(self, database_name: str) -> Dict:
        """Load a specific database by name."""
        if database_name not in self.DATABASE_CONFIGS:
            raise ValueError(f"Unknown database: {database_name}")
        
        file_path = self.data_dir / self.DATABASE_CONFIGS[database_name]
        logger.info(f"Loading database: {database_name} from {file_path}")
        
        database = self.loader.load_database(file_path)
        self.databases[database_name] = database
        return database
    
    def load_all_databases(self) -> Dict[str, Dict]:
        """Load all available databases."""
        logger.info("Loading all databases...")
        for db_name in self.DATABASE_CONFIGS:
            try:
                self.load_database(db_name)
                logger.info(f"✓ Loaded {db_name}")
            except Exception as e:
                logger.warning(f"✗ Failed to load {db_name}: {e}")
        
        logger.info(f"Loaded {len(self.databases)} databases successfully")
        return self.databases
    
    def build_combined_graph(self, databases: Optional[List[str]] = None):
        """Build a combined graph from multiple databases."""
        if databases is None:
            databases = list(self.databases.keys())
        
        logger.info(f"Building combined graph from {len(databases)} databases")
        
        # Combine data from selected databases
        combined_data = self.graph_builder.combine_databases(
            {name: self.databases[name] for name in databases if name in self.databases}
        )
        
        # Build the graph
        self.combined_graph = self.graph_builder.build_graph(combined_data)
        logger.info(f"Built graph with {len(self.combined_graph.nodes)} nodes and {len(self.combined_graph.edges)} edges")
        
        return self.combined_graph
    
    def analyze_single_database(self, database_name: str, **kwargs):
        """Analyze a single database and generate visualizations."""
        logger.info(f"Analyzing database: {database_name}")
        
        # Load database if not already loaded
        if database_name not in self.databases:
            self.load_database(database_name)
        
        database = self.databases[database_name]
        
        # Build graph
        graph = self.graph_builder.build_graph(database)
        
        # Apply filters if specified
        if 'filters' in kwargs:
            graph = self.filter_system.apply_filters(graph, kwargs['filters'])
        
        # Generate statistics
        stats = self.statistics_generator.generate_statistics(graph, database)
        
        # Create visualization
        layout_type = kwargs.get('layout', 'spring')
        show_labels = kwargs.get('show_labels', True)
        
        fig = self.visualization_engine.create_interactive_mindmap(
            graph, database_name, layout_type, show_labels
        )
        
        # Save outputs
        output_base = self.output_dir / f"{database_name}_analysis"
        
        # Save visualization
        html_file = f"{output_base}.html"
        fig.write_html(html_file)
        logger.info(f"Saved visualization: {html_file}")
        
        # Initialize stats_file variable BEFORE the conditional block
        stats_file = None
        
        # Save statistics if requested
        if kwargs.get('export_stats', True):
            stats_file = f"{output_base}_statistics.json"
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2, default=str)
            logger.info(f"Saved statistics: {stats_file}")
        
        return {
            'graph': graph,
            'statistics': stats,
            'visualization': fig,
            'output_files': {'html': html_file, 'stats': stats_file}
        }
    
    def compare_countries(self, databases: Optional[List[str]] = None, countries: Optional[List[str]] = None):
        """Generate country comparison analysis."""
        if databases is None:
            databases = list(self.databases.keys())
        
        if countries is None:
            countries = ['UK', 'USA', 'Russia', 'China']
        
        logger.info(f"Comparing countries {countries} across {len(databases)} databases")
        
        # Build combined graph
        if self.combined_graph is None:
            self.build_combined_graph(databases)
        
        # Generate comparison
        comparison = self.statistics_generator.compare_countries(
            self.combined_graph, countries, databases
        )
        
        # Create comparison visualization
        fig = self.visualization_engine.create_country_comparison(comparison)
        
        # Save results
        output_file = self.output_dir / "country_comparison.html"
        fig.write_html(output_file)
        
        comparison_file = self.output_dir / "country_comparison.json"
        with open(comparison_file, 'w') as f:
            json.dump(comparison, f, indent=2, default=str)
        
        logger.info(f"Saved country comparison: {output_file}")
        return comparison
    
    def generate_comprehensive_report(self, databases: Optional[List[str]] = None):
        """Generate a comprehensive analysis report."""
        if databases is None:
            databases = list(self.databases.keys())
        
        logger.info("Generating comprehensive analysis report")
        
        # Build combined graph if needed
        if self.combined_graph is None:
            self.build_combined_graph(databases)
        
        # Generate comprehensive statistics
        report = self.statistics_generator.generate_comprehensive_report(
            self.combined_graph, self.databases, databases
        )
        
        # Create dashboard visualization
        dashboard = self.visualization_engine.create_dashboard(report)
        
        # Save report
        report_file = self.output_dir / "comprehensive_report.html"
        dashboard.write_html(report_file)
        
        report_data_file = self.output_dir / "comprehensive_report.json"
        with open(report_data_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Saved comprehensive report: {report_file}")
        return report

def main():
    """Main function to run the analyzer."""
    parser = argparse.ArgumentParser(
        description="IES4 Military Database Analysis Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze comprehensive database
  python military_database_analyzer.py --database comprehensive --layout hierarchical

  # Compare countries across all databases
  python military_database_analyzer.py --compare-countries --countries UK USA Russia China

  # Generate comprehensive report
  python military_database_analyzer.py --comprehensive-report --all-databases

  # Analyze specific databases with filters
  python military_database_analyzer.py --databases ships aircraft --filter country UK --filter type destroyer

  # Export statistics to CSV
  python military_database_analyzer.py --database vehicles --export-csv --statistics
        """
    )
    
    # Database selection
    parser.add_argument('--database', choices=list(MilitaryDatabaseAnalyzer.DATABASE_CONFIGS.keys()),
                       help='Analyze a specific database')
    parser.add_argument('--databases', nargs='+', choices=list(MilitaryDatabaseAnalyzer.DATABASE_CONFIGS.keys()),
                       help='Analyze multiple specific databases')
    parser.add_argument('--all-databases', action='store_true',
                       help='Load and analyze all available databases')
    
    # Analysis options
    parser.add_argument('--compare-countries', action='store_true',
                       help='Generate country comparison analysis')
    parser.add_argument('--countries', nargs='+', default=['UK', 'USA', 'Russia', 'China'],
                       help='Countries to include in comparison')
    parser.add_argument('--comprehensive-report', action='store_true',
                       help='Generate comprehensive analysis report')
    
    # Visualization options
    parser.add_argument('--layout', choices=['spring', 'hierarchical', 'circular', 'force'],
                       default='spring', help='Layout algorithm for visualization')
    parser.add_argument('--no-labels', action='store_true',
                       help='Hide node labels in visualization')
    
    # Filtering options
    parser.add_argument('--filter', action='append', nargs=2, metavar=('KEY', 'VALUE'),
                       help='Apply filters (can be used multiple times)')
    
    # Output options
    parser.add_argument('--output-dir', default='output',
                       help='Output directory for generated files')
    parser.add_argument('--statistics', action='store_true',
                       help='Generate detailed statistics')
    parser.add_argument('--export-csv', action='store_true',
                       help='Export data to CSV format')
    parser.add_argument('--export-json', action='store_true',
                       help='Export data to JSON format')
    
    # Data directory
    parser.add_argument('--data-dir', default='data',
                       help='Directory containing database files')
    
    # Misc options
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    parser.add_argument('--web', action='store_true',
                       help='Launch web interface')
    
    args = parser.parse_args()
    
    # Configure logging
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Update output directory if specified
    if args.output_dir != 'output':
        Path(args.output_dir).mkdir(exist_ok=True)
    
    # Initialize analyzer
    analyzer = MilitaryDatabaseAnalyzer(args.data_dir)
    
    # Override output directory if specified
    if args.output_dir != 'output':
        analyzer.output_dir = Path(args.output_dir)
        analyzer.output_dir.mkdir(exist_ok=True)
    
    try:
        # Handle web interface
        if args.web:
            from src.web_interface import launch_web_interface
            launch_web_interface(analyzer)
            return
        
        # Load databases
        if args.all_databases:
            analyzer.load_all_databases()
        elif args.databases:
            for db_name in args.databases:
                analyzer.load_database(db_name)
        elif args.database:
            analyzer.load_database(args.database)
        else:
            # Default to comprehensive database if it exists
            try:
                analyzer.load_database('comprehensive')
            except:
                # If comprehensive doesn't exist, try uk as fallback
                try:
                    analyzer.load_database('uk')
                    logger.info("Loaded uk database as fallback")
                except:
                    logger.error("No databases could be loaded. Please check your data directory.")
                    sys.exit(1)
        
        # Parse filters
        filters = {}
        if args.filter:
            for key, value in args.filter:
                filters[key] = value
        
        # Execute analysis based on arguments
        if args.compare_countries:
            databases = args.databases if args.databases else None
            analyzer.compare_countries(databases, args.countries)
        
        elif args.comprehensive_report:
            databases = args.databases if args.databases else None
            analyzer.generate_comprehensive_report(databases)
        
        elif args.database:
            # Single database analysis
            result = analyzer.analyze_single_database(
                args.database,
                layout=args.layout,
                show_labels=not args.no_labels,
                filters=filters,
                export_stats=args.statistics
            )
            
            if args.export_csv:
                # Export to CSV
                output_file = analyzer.output_dir / f"{args.database}_data.csv"
                analyzer.statistics_generator.export_to_csv(
                    result['graph'], str(output_file)
                )
                
                # Also export edges
                edges_file = analyzer.output_dir / f"{args.database}_edges.csv"
                analyzer.statistics_generator.export_edges_to_csv(
                    result['graph'], str(edges_file)
                )
                logger.info(f"Exported CSV files to {analyzer.output_dir}")
        
        else:
            # Default comprehensive analysis
            if not analyzer.databases:
                analyzer.load_all_databases()
            analyzer.generate_comprehensive_report()
        
        logger.info("Analysis complete. Check the output directory for results.")
        
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()