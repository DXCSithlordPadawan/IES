"""
Setup script for IES4 Military Database Analysis Suite
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text()

setup(
    name="ies4-military-database-analysis",
    version="1.0.0",
    author="DXCSithlordPadawan",
    author_email="your.email@example.com",
    description="Comprehensive analysis suite for IES4 military databases with interactive mind maps",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/DXCSithlordPadawan/ies4-military-database-analysis",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.13",
        "Topic :: Scientific/Engineering :: Visualization",
        "Topic :: Scientific/Engineering :: Information Analysis",
    ],
    python_requires=">=3.8",
    install_requires=[
        "networkx>=3.0",
        "plotly>=5.15.0",
        "pandas>=1.5.0",
        "numpy>=1.20.0",
        "python-dateutil>=2.8.0",
        "flask>=2.3.0",
        "dash>=2.14.0",
        "jinja2>=3.1.0",
        "scikit-learn>=1.0.0",
        "jsonschema>=4.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ],
        "geo": [
            "folium>=0.14.0",
            "geopandas>=0.13.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "ies4-analyze=military_database_analyzer:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["templates/*.html", "static/css/*.css", "static/js/*.js"],
    },
)