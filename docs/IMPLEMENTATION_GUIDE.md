# Technical Implementation Guide

This guide details the architecture, design choices, local development setup, and deployment processes for **InfraOracle (Architecture Whisperer)**.

---

## 🏗️ System Architecture & Stack

InfraOracle is structured as a modern Node.js monorepo workspaces project:

```text
infraoracle/
├── backend/                  # Node.js + Express API Proxy
│   ├── server.js             # Express server with WebSocket support
│   ├── .env.local            # Local backend environment variables (git-ignored)
│   └── package.json          # Backend dependencies (express, google-auth-library, ws, etc.)
├── frontend/                 # React + TypeScript (Vite)
│   ├── App.tsx               # Main application layout & state machine
│   ├── index.tsx             # Entry point loading the API Interceptor
│   ├── vertex-ai-proxy-interceptor.js # Local fetch & websocket interceptor
│   ├── components/           # Whiteboard, Interactive Canvas, Mermaid diagrams
│   ├── services/             # Gemini and GCP Scanner services
│   └── package.json          # Frontend dependencies (react, lucide-react, @google/genai)
├── docs/                     # Technical specifications & documentation
├── package.json              # Monorepo workspaces definition
├── Dockerfile                # Production multi-stage Docker image
└── .dockerignore             # Docker build ignores
```

### Key Technical Patterns
1. **Frontend Request Interception**: Rather than calling Google Cloud Vertex APIs directly from the browser (which would expose credentials), the application loads `frontend/vertex-ai-proxy-interceptor.js` at runtime. It intercepts calls made by the `@google/genai` client and forwards them as secure requests to our Express backend.
2. **Secure Express Proxying**: The backend (`backend/server.js`) intercepts proxy calls, validates the custom security headers to ensure they originate from our client, and forwards them to the official Google Cloud Vertex AI endpoint using **Application Default Credentials (ADC)**.
3. **Unified Single-Container Server**: In production, the Express backend serves compiled frontend static assets from `frontend/dist` and handles fallback single-page-app routing. This compiles the entire monorepo into a single, cohesive, serverless container deployed to Cloud Run.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: Version 18 or higher (v20+ recommended).
- **Google Cloud SDK (`gcloud`)**: Installed and initialized.
- **Application Default Credentials (ADC)**: Authenticate your local machine with your Google Cloud project:
  ```bash
  gcloud auth application-default login
  ```

### 2. Install Dependencies
Run from the project root directory to automatically resolve and install dependencies across all workspaces:
```bash
npm install
```

### 3. Environment Variables
Create an environment configuration file in `backend/.env.local`:
```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=asia-northeast1
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_PAYLOAD_MAX_SIZE=10mb
```

### 4. Run the Dev Servers
Start both the React dev server and Express proxy server concurrently:
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🚀 Google Cloud Run Deployment

Cloud Run is the recommended production environment because of its auto-scaling features, secure metadata server integrations, and seamless connection with Vertex AI.

### Step 1: Pre-Build the Frontend (Local Verification)
Verify that the React frontend compiles with no TypeScript or asset bundle errors:
```bash
npm run build --prefix frontend
```

### Step 2: Deploy Using Google Cloud Build & Cloud Run
Deploy the application with a single command from the project root. The Google Cloud SDK reads our `Dockerfile` and builds the secure, lightweight multi-stage container automatically:

```bash
gcloud run deploy infraoracle \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your-gcp-project-id,GOOGLE_CLOUD_LOCATION=asia-northeast1 \
  --memory 1Gi \
  --timeout 300
```

> [!IMPORTANT]
> - Ensure the service account running the Cloud Run service has the **Vertex AI User** (`roles/aiplatform.user`) role assigned in your Google Cloud IAM console. This enables server-side proxy calls to authenticate seamlessly via ADC without needing static API keys.
> - No local `.env` or `.env.local` files are copied into the container build (enforced by `.dockerignore`), maintaining ironclad secret separation.

---

## 🛡️ Security & Compliance Controls

1. **Anti-SSRF (Server-Side Request Forgery)**: The Node.js proxy server enforces an explicit allow-list of upstream Google Cloud Vertex hosts (`aiplatform.clients6.google.com`). This blocks token exfiltration attacks.
2. **Access Protection**: Incoming client proxy requests are checked for a custom cryptographic transit header (`x-app-proxy`), ensuring only requests initiated by our authorized frontend client are routed.
3. **No Hardcoded Secrets**: Leverages Cloud IAM Roles and Google Application Default Credentials (ADC) to generate short-lived OAuth2 access tokens dynamically on the server.
