# InfraOracle - End-to-End Architecture & Data Flow

InfraOracle is a production-grade, interactive cloud architecture design and review platform. It bridges the gap between conceptual whiteboard sketches, structured system designs, and rigorous architectural reviews (Security, Cost, and Reliability) in a single, seamless workflow.

---

## 1. High-Level System Architecture

```text
+---------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                  |
|                                                                                 |
|  +-----------------------+  +-----------------------+  +---------------------+  |
|  |   Whiteboard Canvas   |  |  Interactive Canvas   |  |   Mermaid Diagram   |  |
|  |   (Napkin Sketches)   |  |  (Lightweight Draw.io)|  |  (Dynamic Render)   |  |
|  +-----------+-----------+  +-----------+-----------+  +----------+----------+  |
|              |                          ^                         ^             |
|              v                          |                         |             |
|  +-----------+--------------------------+-------------------------+----------+  |
|  | App.tsx (State Coordinator, Remediation Tracker, Cost Calculator)         |  |
|  +--------------------------------------+------------------------------------+  |
+-----------------------------------------|---------------------------------------+
                                          |
                                          | Secure API Calls (via @google/genai)
                                          v
+---------------------------------------------------------------------------------+
|                            GOOGLE CLOUD PLATFORM                                |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | Gemini API (gemini-2.5-flash / gemini-3.5-flash)                          |  |
|  |                                                                           |  |
|  |  1. Design Agent: Multimodal Input -> Structured Architecture JSON        |  |
|  |  2. Review Agent: Architecture Context -> Security, Cost, Reliability JSON|  |
|  |  3. Existing Reviewer: Legacy Specs -> Actionable Remediation JSON        |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | Antigravity Managed Agent Runtime (Remote Sandbox Simulation)             |  |
|  |  - Isolated execution environment for deep architectural reasoning        |  |
|  |  - Real-time agent console logs streamed directly to the UI               |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | Cloud Run (Serverless Hosting)                                            |  |
|  |  - Hosts the production-ready single-page application                     |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 2. End-to-End Data Flow

### Step 1: Input Capture & Multimodal Ingestion
The user initiates the flow in one of two modes:
*   **Design & Review (Phase 1):** The user describes their requirements in plain text and optionally uploads an architecture diagram/napkin sketch. Alternatively, they can use the built-in **Whiteboard Canvas** to draw a sketch directly in the browser.
*   **Review Existing (Phase 2):** The user pastes an existing architecture description, a Mermaid diagram, or a Terraform snippet.

### Step 2: Structured Generation via Gemini API
When the user clicks **Analyze & Design**, the application packages the text prompt and any base64-encoded image data. It dispatches a request to the **Gemini API** (`gemini-2.5-flash` / `gemini-3.5-flash`) using the official `@google/genai` SDK.
*   **Strict Schema Enforcement:** The API call utilizes `responseSchema` to guarantee that the model returns a perfectly structured JSON object containing:
    *   `title` & `summary`
    *   `mermaid_diagram` (raw, valid Mermaid.js syntax)
    *   `components` (list of official GCP services)
    *   `terraform_snippet` (starter infrastructure-as-code)
    *   `estimated_monthly_cost`
    *   `design_decisions`

### Step 3: Antigravity Managed Agent Review
Once the architecture design is generated, the design JSON is passed directly into the **Review Agent**.
*   If **Antigravity Agent Mode** is enabled, the review runs inside a simulated remote Google sandbox. The UI displays a live **Agent Console** streaming real-time execution logs (e.g., mounting context, running security scanners, evaluating multi-region failover).
*   The Review Agent evaluates the design across three strict categories: **Security**, **Cost**, and **Reliability**, returning a structured JSON report with an overall score, a verdict, and the top 3 critical remediation actions.

### Step 4: Dual-Engine Visualization (Mermaid + Interactive GCP Canvas)
Once the results are returned, the frontend renders them using two powerful visualization engines:
1.  **Mermaid Diagram Engine:** Renders the raw Mermaid syntax dynamically. It includes a custom pre-processor/sanitizer that automatically detects and fixes unquoted parentheses or brackets in node labels to prevent rendering crashes.
2.  **Interactive GCP Canvas (Draw.io Experience):** Maps the generated GCP components onto an interactive grid. Users can inspect individual components, drag them around, add new official services from the GCP Palette, delete components, and draw custom connection lines.

### Step 5: Interactive Remediation & Cost Scaling
*   **Remediation Readiness Tracker:** The findings returned by the review are rendered as an interactive checklist. As the user checks off resolved findings, a dynamic progress bar recalculates their **Remediation Readiness Score** in real-time.
*   **Cost Scaling Calculator:** Users can use an interactive slider to scale their expected traffic (from Dev/Test up to Enterprise 1M+ MAU). The UI dynamically calculates and displays the scaled monthly run rate.
*   **Terraform & Markdown Export:** Users can copy the starter Terraform code with a single click or export the entire design and review report as a clean, beautifully formatted Markdown file.

---

## 3. Key Files & Responsibilities

*   `App.tsx`: The central state coordinator. Manages active tabs, loading states, interactive checklists, cost scaling, and coordinates calls to the Gemini service.
*   `services/geminiService.ts`: Handles all communication with the Gemini API. Enforces strict JSON schemas for both generation and review tasks.
*   `components/InteractiveGCPCanvas.tsx`: Implements the lightweight "draw.io" style interactive canvas with drag-and-drop GCP components and connection lines.
*   `components/WhiteboardCanvas.tsx`: Implements the HTML5 canvas drawing board for napkin sketches.
*   `components/MermaidDiagram.tsx`: Handles robust rendering, full-screen modal viewing, and sanitization of Mermaid.js diagrams.
*   `types.ts`: Defines strict TypeScript interfaces for state management and API contracts.
