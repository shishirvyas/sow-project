# Database-Driven Prompt Management

This feature allows you to store and manage SOW analysis prompts in a PostgreSQL database with dynamic variable substitution.

## Features

- **Database Storage**: Store prompt templates in PostgreSQL
- **Dynamic Variables**: Use `{{variable_name}}` placeholders that get replaced with values from the database
- **Version Control**: Update variables without changing prompt structure
- **API Management**: REST endpoints to view and update prompts

## Setup

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb sow_prompts
```

### 2. Set Environment Variables

Add to your `.env` file:

```env
# Enable database-driven prompts
USE_PROMPT_DATABASE=true

# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sow_prompts
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Initialize Database Schema

```bash
cd /Users/shilpadhavale/sow-project/sow-backend

# Run schema creation
psql -d sow_prompts -f src/app/db/schema.sql
```

### 4. Install Python Dependencies

```bash
pip install psycopg2-binary
```

## Database Schema

### `prompt_templates` Table
- `id`: Primary key
- `clause_id`: Unique identifier (e.g., 'ADM-E01', 'ADM-E04')
- `name`: Human-readable name
- `prompt_text`: Template with `{{variable}}` placeholders
- `is_active`: Enable/disable prompts
- `created_at`, `updated_at`: Timestamps

### `prompt_variables` Table
- `id`: Primary key
- `prompt_id`: Foreign key to prompt_templates
- `variable_name`: Name of the variable
- `variable_value`: Current value
- `description`: What this variable controls

## Variable Substitution

In your prompt template, use double curly braces:

```
COMPLIANCE RULES:
- Cap > {{max_cap}}%: Non-compliant
- Cap > {{preferred_cap}}% and <= {{max_cap}}%: Tighten
```

These will be replaced with actual values from `prompt_variables`:

```sql
INSERT INTO prompt_variables (prompt_id, variable_name, variable_value)
VALUES (1, 'max_cap', '5'),
       (1, 'preferred_cap', '3.5');
```

Result:
```
COMPLIANCE RULES:
- Cap > 5%: Non-compliant
- Cap > 3.5% and <= 5%: Tighten
```

## API Endpoints

### List All Prompts
```bash
GET http://localhost:8000/api/v1/prompts

Response:
{
  "prompts": ["ADM-E01", "ADM-E04"],
  "count": 2
}
```

### Get Specific Prompt (with variables populated)
```bash
GET http://localhost:8000/api/v1/prompts/ADM-E01

Response:
{
  "clause_id": "ADM-E01",
  "prompt": "You are a procurement clause auditor... Cap > 5%..."
}
```

### Get Variables for a Prompt
```bash
GET http://localhost:8000/api/v1/prompts/ADM-E01/variables

Response:
{
  "clause_id": "ADM-E01",
  "variables": {
    "max_cap": "5",
    "preferred_cap": "3.5",
    "fallback_cap": "4.0",
    "trigger_terms": "rate increase, CPI..."
  }
}
```

### Update a Variable
```bash
PUT http://localhost:8000/api/v1/prompts/ADM-E01/variables
Content-Type: application/json

{
  "variable_name": "max_cap",
  "variable_value": "6"
}

Response:
{
  "message": "Variable updated successfully",
  "clause_id": "ADM-E01",
  "variable_name": "max_cap",
  "new_value": "6"
}
```

## Usage Example

### Update Preferred Cap from 3.5% to 3%

```bash
curl -X PUT http://localhost:8000/api/v1/prompts/ADM-E01/variables \
  -H "Content-Type: application/json" \
  -d '{"variable_name": "preferred_cap", "variable_value": "3"}'
```

Next time the SOW processing runs, it will use 3% instead of 3.5% in the prompt!

## Switching Between File and Database Mode

### Use Database Prompts
```env
USE_PROMPT_DATABASE=true
```

### Use File-Based Prompts (original behavior)
```env
USE_PROMPT_DATABASE=false
```

Or remove the variable entirely to default to file-based prompts.

## Benefits

1. **No Code Changes**: Update compliance rules without deploying new code
2. **Consistency**: All prompts use the same variable values
3. **Auditability**: Track when and what changed
4. **Multi-tenant**: Different organizations can have different cap percentages
5. **A/B Testing**: Easy to test different prompt variations

## Migration from Files

Your existing `.txt` files remain untouched. The system will:
1. Check `USE_PROMPT_DATABASE` env var
2. If `true`: Load from database
3. If `false` or unset: Load from `resources/clause-lib/*.txt`

Both ADM-E01 and ADM-E04 prompts are pre-loaded in the schema with their current values!
