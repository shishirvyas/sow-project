# Aiven Database Setup Complete ✅

Your SOW analysis prompts are now database-driven using Aiven PostgreSQL!

## What Was Set Up

### 1. Database Tables Created
- ✅ `prompt_templates` - Stores prompt text with `{{variable}}` placeholders
- ✅ `prompt_variables` - Stores dynamic values for substitution

### 2. Data Loaded
- ✅ **ADM-E01** - Annual Rate Increase Audit (7 variables)
- ✅ **ADM-E04** - Defect Remediation and Warranty Audit (10 variables)

### 3. Configuration Updated
Your `.env` now includes:
```env
USE_PROMPT_DATABASE=true
DB_HOST=sow-service-sow.f.aivencloud.com
DB_PORT=15467
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=<your-password-here>
```

## How It Works

### Dynamic Variables
Prompts use `{{variable_name}}` syntax. For example:

**In Database:**
```
Cap > {{max_cap}}%: Non-compliant
```

**After Substitution:**
```
Cap > 5%: Non-compliant
```

### Current Variables for ADM-E01
- `max_cap`: 5
- `preferred_cap`: 3.5
- `fallback_cap`: 4.0
- `focus_sections`: Pricing, Rate Schedule, and Escalation Clause sections
- `trigger_terms`: rate increase, CPI, CPI-U, Consumer Price Index...
- `clause_id`: ADM-E01
- `examples`: (4 complete examples)

### Current Variables for ADM-E04
- `warranty_months`: 6
- `min_warranty_months`: 4
- `focus_sections`: SLA, Warranty Terms, and Quality Clause sections
- `trigger_terms`: defect, bug, issue, error, fault...
- Plus 6 more variables

## Testing the Setup

### 1. Restart Your Server
```bash
# The server should pick up the new .env settings
```

### 2. Test API Endpoints

**List all prompts:**
```bash
curl http://localhost:8000/api/v1/prompts
```

**Get ADM-E01 prompt (with variables populated):**
```bash
curl http://localhost:8000/api/v1/prompts/ADM-E01
```

**View ADM-E01 variables:**
```bash
curl http://localhost:8000/api/v1/prompts/ADM-E01/variables
```

**Update a variable (e.g., change max_cap from 5% to 6%):**
```bash
curl -X PUT http://localhost:8000/api/v1/prompts/ADM-E01/variables \
  -H "Content-Type: application/json" \
  -d '{"variable_name": "max_cap", "variable_value": "6"}'
```

### 3. Process SOWs with Database Prompts
```bash
curl -X POST http://localhost:8000/api/v1/process-sows
```

The system will now fetch prompts from Aiven PostgreSQL instead of `.txt` files!

## Benefits

1. **No Code Deployments** - Update compliance rules by changing database values
2. **Centralized Management** - All prompts in one place
3. **Version Control** - Track changes with timestamps
4. **Multi-Tenant Ready** - Different orgs can have different rules
5. **API-Driven** - Update prompts via REST API

## Quick Changes

### Change Preferred Cap from 3.5% to 3%
```bash
curl -X PUT http://localhost:8000/api/v1/prompts/ADM-E01/variables \
  -H "Content-Type: application/json" \
  -d '{"variable_name": "preferred_cap", "variable_value": "3"}'
```

### Change Warranty Period from 6 to 12 months
```bash
curl -X PUT http://localhost:8000/api/v1/prompts/ADM-E04/variables \
  -H "Content-Type: application/json" \
  -d '{"variable_name": "warranty_months", "variable_value": "12"}'
```

## Switching Back to Files (if needed)

Set in `.env`:
```env
USE_PROMPT_DATABASE=false
```

The system will fall back to loading from `resources/clause-lib/*.txt`

## Database Connection Info

- **Server**: sow-service-sow.f.aivencloud.com
- **Port**: 15467
- **Database**: defaultdb
- **SSL**: Required (automatically configured)

## Next Steps

1. ✅ Database created
2. ✅ Tables created
3. ✅ Data loaded
4. ✅ Configuration updated
5. 🔄 **Restart your FastAPI server**
6. 🧪 **Test the API endpoints**
7. 🚀 **Process SOWs with dynamic prompts**

Everything is ready to go! 🎉
