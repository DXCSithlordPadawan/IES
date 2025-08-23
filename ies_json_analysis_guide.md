# IES4 JSON Processing Analysis Guide

## Overview
This guide helps diagnose why `combined_ies4.json` files are not processing correctly in IES (Information Exchange Standard) implementations.

## Common Issues with IES4 JSON Processing

### 1. JSON Structure Validation
```bash
# Check if JSON is valid
python -m json.tool combined_ies4.json > /dev/null
```

### 2. Schema Compliance Issues
- **Missing required fields**: IES4 has specific mandatory properties
- **Incorrect data types**: Ensure strings, numbers, arrays match schema
- **Invalid relationships**: Check entity references and relationships

### 3. Common IES4 JSON Problems

#### A. Namespace Issues
```json
{
  "@context": {
    "ies": "http://ies.data.gov.uk/ontology/ies4#"
  }
}
```

#### B. Entity Reference Problems
- Broken `@id` references
- Missing entity definitions
- Circular references

#### C. Property Validation
- Invalid property names not in IES4 ontology
- Missing required properties for entity types
- Incorrect value formats (dates, coordinates, etc.)

## Diagnostic Steps

### Step 1: Basic JSON Validation
```python
import json

def validate_json_syntax(filename):
    try:
        with open(filename, 'r') as f:
            json.load(f)
        print("✓ JSON syntax is valid")
        return True
    except json.JSONDecodeError as e:
        print(f"✗ JSON syntax error: {e}")
        return False
```

### Step 2: IES4 Structure Analysis
```python
def analyze_ies4_structure(data):
    issues = []
    
    # Check for @context
    if "@context" not in data:
        issues.append("Missing @context definition")
    
    # Check for @graph or entities
    if "@graph" not in data and not isinstance(data, list):
        issues.append("No @graph array or entity list found")
    
    # Validate entities
    entities = data.get("@graph", data if isinstance(data, list) else [])
    for i, entity in enumerate(entities):
        if "@id" not in entity:
            issues.append(f"Entity {i} missing @id")
        if "@type" not in entity:
            issues.append(f"Entity {i} missing @type")
    
    return issues
```

### Step 3: IES4 Ontology Compliance
Check against IES4 standard classes and properties:

#### Core IES4 Classes to Validate:
- `ies:Entity`
- `ies:Event` 
- `ies:Location`
- `ies:Person`
- `ies:Organisation`
- `ies:ResponsibleActor`

#### Common Properties to Check:
- `ies:isParticipantIn`
- `ies:hasName`
- `ies:inLocation`
- `ies:hasRepresentation`

### Step 4: Relationship Validation
```python
def validate_relationships(data):
    entities = data.get("@graph", data if isinstance(data, list) else [])
    entity_ids = {e.get("@id") for e in entities if "@id" in e}
    
    broken_refs = []
    for entity in entities:
        for key, value in entity.items():
            if key.startswith("ies:") and isinstance(value, dict):
                if "@id" in value and value["@id"] not in entity_ids:
                    broken_refs.append(f"Broken reference: {value['@id']}")
    
    return broken_refs
```

## Repository-Specific Analysis

### Files to Check:
1. **combined_ies4.json** - Main data file
2. **Processing scripts** - Look for Python/JS parsers
3. **Schema files** - JSON Schema or SHACL validation
4. **Configuration files** - Processing parameters
5. **Log files** - Error messages and stack traces

### Code Analysis Points:

#### 1. JSON Loading Code
```python
# Look for patterns like:
with open('combined_ies4.json') as f:
    data = json.load(f)  # Check encoding issues

# Or async loading:
import aiofiles
async with aiofiles.open('combined_ies4.json') as f:
    data = json.loads(await f.read())
```

#### 2. Processing Logic
- Entity iteration loops
- Property validation
- Relationship resolution
- Data transformation steps

#### 3. Error Handling
- Try/catch blocks around JSON operations
- Validation error collection
- Logging mechanisms

## Debugging Commands

### Memory Issues
```bash
# Check file size
ls -lh combined_ies4.json

# Monitor memory usage during processing
/usr/bin/time -v python process_ies.py
```

### Performance Analysis
```bash
# Profile JSON loading
python -m cProfile -o profile.stats process_ies.py
```

### Content Inspection
```bash
# Check file encoding
file combined_ies4.json

# Look for non-UTF8 characters
hexdump -C combined_ies4.json | grep -v "^[0-9a-f]*  [2-7][0-9a-f] "
```

## Common Fixes

### 1. Encoding Issues
```python
# Use explicit UTF-8 encoding
with open('combined_ies4.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
```

### 2. Large File Handling
```python
# Stream processing for large files
import ijson

def process_large_json(filename):
    with open(filename, 'rb') as file:
        for entity in ijson.items(file, '@graph.item'):
            # Process each entity individually
            yield entity
```

### 3. Schema Validation
```python
import jsonschema

def validate_against_ies4_schema(data, schema_file):
    with open(schema_file) as f:
        schema = json.load(f)
    
    try:
        jsonschema.validate(data, schema)
        return True, []
    except jsonschema.ValidationError as e:
        return False, [str(e)]
```

## Next Steps

1. **Clone the repository locally**:
   ```bash
   git clone https://github.com/DXCSithlordPadawan/IES.git
   cd IES
   ```

2. **Run basic diagnostics**:
   - Validate JSON syntax
   - Check file encoding
   - Examine file size and structure

3. **Analyze processing code**:
   - Find the main processing script
   - Identify error locations
   - Check dependencies and imports

4. **Test with simplified data**:
   - Create minimal valid IES4 JSON
   - Test processing pipeline
   - Incrementally add complexity

5. **Check IES4 compliance**:
   - Compare against official IES4 examples
   - Validate ontology usage
   - Verify relationship structures

## Resources

- [IES4 Official Repository](https://github.com/dstl/IES4)
- [IES4 Specification Documents](https://github.com/dstl/IES4/tree/master/IES%20Specification%20Docs)
- [JSON-LD Specification](https://www.w3.org/TR/json-ld/)
- [RDF/JSON Processing Tools](https://rdflib.readthedocs.io/)

---

**Note**: Without direct access to the specific repository, this guide provides a systematic approach to diagnose JSON processing issues. Apply these steps to identify the root cause of the `combined_ies4.json` processing problem.