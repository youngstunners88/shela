# Deploy Bhubezi to Render

## Option 1: Render Dashboard (Recommended - Easiest)

1. Go to https://dashboard.render.com/blueprints
2. Click "New Blueprint"
3. Connect your GitHub repo: youngstunners88/Bhubezi
4. Select branch: main
5. Render will read render.yaml and create both services

## Option 2: Manual Service Creation

### Backend Service:
1. Go to https://dashboard.render.com/new/web
2. Name: `bhubezi-backend`
3. Root Directory: `backend`
4. Runtime: `Python 3`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
7. Add Environment Variables:
   - MONGO_URL = your_mongodb_connection_string
   - DB_NAME = bhubezi
   - CORS_ORIGINS = *
8. Click "Create Web Service"

### Frontend Service:
1. Go to https://dashboard.render.com/new/static
2. Name: `bhubezi-frontend`
3. Root Directory: `app`
4. Build Command: `npm install && npm run build`
5. Publish Directory: `dist`
6. Add Environment Variables:
   - VITE_API_URL = https://bhubezi-backend.onrender.com/api
7. Click "Create Static Site"

## After Deployment

Backend: https://bhubezi-backend.onrender.com
Frontend: https://bhubezi-frontend.onrender.com

## Need Help?

Your render.yaml file is already in the repo at:
https://github.com/youngstunners88/Bhubezi/blob/main/render.yaml

This file tells Render exactly how to deploy both services automatically.
