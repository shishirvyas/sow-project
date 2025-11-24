# Prompt Manager Frontend

Staff application for managing SOW analysis prompts and variables.

## Features

- List and search all prompts
- Create new prompts
- View and edit prompt details
- Manage prompt variables (add, edit, bulk upload)
- Real-time updates with React Query

## Tech Stack

- React 18 + TypeScript
- Vite
- Chakra UI
- TanStack React Query
- React Hook Form + Zod
- Axios

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

App runs on http://localhost:3000

The Vite proxy forwards `/api` requests to `http://localhost:8000` (your FastAPI backend).

### Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url.com/api/v1`
4. Deploy

### Deploy to Netlify

1. Push to GitHub
2. Import project on [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_BASE_URL`

## Environment Variables

Create `.env.local` for local overrides:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Project Structure

```
src/
├── components/          # React components
│   ├── PromptList.tsx
│   ├── PromptDetails.tsx
│   ├── CreatePromptModal.tsx
│   ├── VariableEditor.tsx
│   └── BulkVariableUpload.tsx
├── services/
│   └── api.ts          # API client
├── types/
│   └── prompt.types.ts # TypeScript types
├── App.tsx
└── main.tsx
```

## CORS Configuration

Ensure your FastAPI backend allows requests from the frontend:

```python
# In sow-backend/src/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
