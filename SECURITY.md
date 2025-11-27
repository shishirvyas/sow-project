# Environment Variables Setup

## ⚠️ SECURITY WARNING

**NEVER commit `.env` files with real credentials to git!**

The `.env` files in this project contain sensitive information including:
- Database passwords
- API keys (OpenAI, Groq, Azure)
- JWT secret keys
- Azure Storage connection strings

## Setup Instructions

### Backend (Node.js)

1. Copy the example file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update `.env` with your actual credentials:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PORT`: Server port (default: 5000)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

### SOW Backend (Python)

1. Copy the example file:
   ```bash
   cd sow-backend
   cp .env.example .env
   ```

2. Update `.env` with your actual credentials:
   - `DATABASE_URL`: Your PostgreSQL connection string (Aiven or other)
   - `GROQ_API_KEY` or `OPENAI_API_KEY`: LLM provider API key
   - `AZURE_STORAGE_CONNECTION_STRING`: Azure Blob Storage credentials
   - `JWT_SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`

## What's Protected

The following files are in `.gitignore` and will NOT be committed:
- `backend/.env`
- `sow-backend/.env`

The following files ARE committed as templates:
- `backend/.env.example`
- `sow-backend/.env.example`

## If Secrets Were Exposed

If you accidentally committed secrets to git:

1. **Immediately rotate/revoke** all exposed credentials:
   - Regenerate API keys in provider dashboards
   - Change database passwords
   - Generate new JWT secrets

2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/.env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. Force push (⚠️ dangerous if others have cloned):
   ```bash
   git push origin --force --all
   ```

## Best Practices

1. ✅ Use `.env.example` with placeholder values
2. ✅ Keep `.env` in `.gitignore`
3. ✅ Use environment-specific configuration management in production
4. ✅ Rotate secrets regularly
5. ❌ Never log sensitive values
6. ❌ Never commit real credentials
7. ❌ Never share `.env` files via email/chat

## Production Deployment

For production environments:
- Use proper secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- Set environment variables through your hosting platform
- Never store production secrets in files

