# InfraOracle (Architectural Whisperer)

A premium, state-of-the-art AI-powered Cloud Architecture Designer and Reviewer. This application allows users to design complex Google Cloud architectures, review them against key constraints, draw sketch ideas on a whiteboard, and conduct continuous multi-turn chat discussions with an AI backend.

The project has been fully migrated to a robust, scalable **React + TypeScript (Vite) + Node.js/Express** monorepo stack, optimizing for high-performance frontend interfaces and secure server-side Vertex AI proxying.

---

## 🏗️ Project Architecture

```text
infraoracle/
├── backend/                  # Node.js + Express API Proxy
│   ├── server.js             # Secure proxy handling Vertex AI authentication (ADC)
│   ├── .env.local            # Backend environment variables
│   └── package.json          # Backend-specific scripts and dependencies
├── frontend/                 # React + TypeScript SPA (Vite)
│   ├── App.tsx               # Main premium dashboard and UI logic
│   ├── components/           # UI components (Drawing canvas, etc.)
│   ├── services/             # Frontend services (Gemini Vertex API calls)
│   ├── types.ts              # Shared TypeScript definitions
│   └── package.json          # Frontend-specific scripts and dependencies
├── docs/                     # Documentation files
├── package.json              # Monorepo workspaces definition
└── README.md                 # Project README (This file)
```

---

## 🛠️ Features

- **Continuous Multi-turn Chat**: Engage in deep discussions about architectural designs with contextual awareness.
- **Interactive Whiteboard Canvas**: Sketch out architectures directly inside the browser, export as base64 images, and attach them to prompts.
- **Constraint Chips**: Easily toggle constraints (e.g., *Cheapest*, *More Secure*, *Fastest to Build*, *Global Scale*, *Enterprise Ready*) to guide the AI generator in the background.
- **Interactive Budget Slider**: Dynamically adjust target monthly budget limits.
- **Dynamic Readiness Checklists**: Interactive validation checkers tracking design completeness.
- **Remote Sandbox Logs**: Sandbox console simulated logs illustrating cloud validation activities.
- **High-Security API Proxy**: Node.js backend handles OAuth2 authentication with Google Cloud using Application Default Credentials (ADC), preventing any API key exposure on the frontend.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites

- **Node.js**: Version 18 or higher is recommended.
- **Google Cloud SDK (`gcloud`)**: Installed and authenticated.
- **Application Default Credentials (ADC)**: Ensure your local environment is authenticated with Google Cloud:
  ```bash
  gcloud auth application-default login
  ```

### 2. Install Dependencies

Install all monorepo dependencies (frontend and backend) from the project root using npm workspaces:

```bash
npm install
```

### 3. Backend Environment Configuration

Ensure `backend/.env.local` contains the following variables configured:

```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=asia-northeast1
PROXY_HEADER=q_pugYyz5WZB85uiz2-b8uV7xHFXQt4d
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_PAYLOAD_MAX_SIZE=10mb
```

*Note: `PROXY_HEADER` is optional and automatically defaults to the front-end interceptor token `q_pugYyz5WZB85uiz2-b8uV7xHFXQt4d` if omitted.*

### 4. Run Frontend & Backend Concurrently

Start both the backend server and the frontend Vite development server concurrently with a single command from the root directory:

```bash
npm run dev
```

- **Frontend Interface**: `http://localhost:5173/`
- **Backend API Proxy**: `http://localhost:5000/`

---

## 🐳 Production Deployment (Google Cloud Run)

InfraOracle is fully configured to be containerized and deployed as a single, consolidated unit on Google Cloud Run. The Express backend serves pre-compiled static assets and routes API requests.

### 1. Pre-deployment Build Check
First, verify that the frontend compiles cleanly:
```bash
npm run build --prefix frontend
```

### 2. Deploy to Cloud Run
Deploy directly from the root directory using the Google Cloud SDK. This triggers a secure multi-stage build via Cloud Build using our `Dockerfile`:

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
> To connect to Vertex AI, ensure the Google Cloud service account associated with the Cloud Run service is granted the **Vertex AI User** (`roles/aiplatform.user`) role in your GCP IAM settings. Authentication is handled automatically via Application Default Credentials (ADC), meaning **no API keys are ever hardcoded or exposed**.

---

## 🛡️ Security & Compliance

1. **API Protection**: All client requests are validated with a secure header constraint (`x-app-proxy`) ensuring only traffic originating from our Vite application is processed.
2. **Server-Side Request Forgery (SSRF) Protection**: The Node.js proxy server enforces an explicit allow-list of upstream Google Cloud Vertex endpoints (`aiplatform.clients6.google.com`) to block token exfiltration.
3. **No API Keys Needed**: Authentication is securely powered by Google Cloud ADC tokens, avoiding static secrets storage in local source files.

