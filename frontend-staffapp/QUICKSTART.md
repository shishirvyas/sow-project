# Quick Start Guide

## Setup (First Time Only)

```bash
cd frontend-staffapp
npm install
```

This will install all dependencies (~2-3 minutes).

## Run Development Server

```bash
npm run dev
```

The app will start at **http://localhost:3000**

The backend API should be running at **http://localhost:8000**

## What You Can Do

### ✅ View All Prompts
- Navigate to http://localhost:3000
- See list of all available prompts (ADM-E01, ADM-E04, ADM-R01, etc.)

### ✅ Create New Prompt
1. Click "Create Prompt" button
2. Fill in:
   - Clause ID (e.g., ADM-E05)
   - Name (descriptive title)
   - Prompt Text (with {{variable}} placeholders)
3. Click "Create Prompt"

### ✅ View Prompt Details
1. Click on any prompt card
2. See full prompt text
3. View all variables and their values

### ✅ Edit Variables
1. Open a prompt
2. Click on any variable value to edit inline
3. Or click the edit icon
4. Press Enter to save

### ✅ Add Single Variable
1. Open a prompt
2. Click "Add Variable"
3. Fill in variable name, value, and description
4. Click "Add Variable"

### ✅ Bulk Upload Variables
1. Open a prompt
2. Click "Bulk Upload"
3. Paste JSON array of variables:
```json
[
  {
    "variable_name": "supplier_name",
    "variable_value": "Acme Corp",
    "description": "Name of the supplier"
  },
  {
    "variable_name": "contract_date",
    "variable_value": "2025-01-01"
  }
]
```
4. Click "Upload Variables"

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Chakra UI** - Component library
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling
- **Axios** - HTTP client
- **Vite** - Build tool

## Development Tips

### Hot Module Replacement
Changes to code automatically refresh the browser - no manual reload needed!

### TypeScript Checking
```bash
npm run build
```

### Environment Variables
Edit `.env` to change API URL:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Browser DevTools
- Press F12 to open
- Check Console for errors
- Network tab to see API calls
- React DevTools extension recommended

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or change port in vite.config.ts
```

### Backend Connection Error
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify CORS is configured in backend
3. Check browser console for CORS errors

### npm install Errors
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. ✅ Test all features locally
2. ✅ Customize UI colors/branding (edit Chakra theme)
3. ✅ Deploy to Vercel (see DEPLOYMENT.md)
4. ✅ Add authentication (optional)
5. ✅ Add custom domain (optional)

## Support

- Check browser console for errors
- Review Network tab for failed API calls
- Ensure backend endpoints match `/api/v1/prompts/*`
