# Railway deployment

## Services

Create three Railway services from the same GitHub repository:

1. **privacyguard-api** — Root Directory: `backend`
2. **privacyguard-web** — Root Directory: `artifacts/privacyguard-ai`
3. **Volume** attached to `privacyguard-api` at `/data`

## API variables

```text
DATABASE_PATH=/data/privacyguard.db
UPLOAD_DIR=/data/uploads
CORS_ORIGINS=https://YOUR-FRONTEND-DOMAIN.up.railway.app
```

## Web variable

```text
VITE_API_BASE_URL=https://YOUR-API-DOMAIN.up.railway.app/api
```

## AI limitation

The hosted demo does not expose the local Ollama service. Keep the local AI workflow for private demonstrations until a separate private Ollama service is deployed.
