import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, LayoutTemplate, ShieldCheck, Code2, AlertCircle, 
  CheckCircle2, Server, DollarSign, Activity, ChevronRight, 
  History, Trash2, Download, Sparkles, FileText, RefreshCw, Copy, Check,
  PenTool, Terminal, Sliders, ClipboardList, HelpCircle, Info, ExternalLink, Award,
  Send, User, Bot, Sparkle, Cloud, Minimize2, Maximize2, X, Lock, Database, Cpu, Layers,
  ChevronDown, ChevronUp, Key, Sun, Moon
} from 'lucide-react';
import { AppState, ArchitectureDesign, ArchitectureReview, AppMode, SavedRun, ChatTurn } from './types';
import { generateArchitecture, reviewArchitecture, reviewExistingArchitecture } from './services/geminiService';
import { listGcpProjects, scanProjectResources, formatScanResultToMarkdown } from './services/gcpScannerService';
import { MermaidDiagram } from './components/MermaidDiagram';
import { GcpNetworkTopology } from './components/GcpNetworkTopology';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';

const CONSTRAINT_CHIPS = [
  { id: 'cheapest', label: 'Cheapest', desc: 'Prioritize scale-to-zero serverless, free tiers, and cost-minimization.' },
  { id: 'more secure', label: 'More Secure', desc: 'Enforce VPCs, Secret Manager, least privilege, disabled public IPs.' },
  { id: 'fastest to build', label: 'Fastest to Build', desc: 'Focus on low operational complexity, quick setups, and managed services.' },
  { id: 'global scale', label: 'Global Scale', desc: 'Global Load Balancers, Cloud CDN, multi-region replication, and HA.' },
  { id: 'student project', label: 'Student Project', desc: 'Close-to-zero cost, extremely simple serverless, no expensive components.' },
  { id: 'enterprise ready', label: 'Enterprise Ready', desc: 'Multi-zone HA databases, disaster recovery, logs, audits, and compliance.' }
];

const SAMPLE_PROMPTS = [
  {
    title: "E-commerce Web App",
    prompt: "Design a GCP architecture for a small e-commerce site with an admin panel, payment flow, and product catalog. Needs to be highly available and cost-effective.",
    mode: "design" as AppMode
  },
  {
    title: "Serverless API",
    prompt: "A serverless REST API using Cloud Run, Cloud SQL (PostgreSQL), and Secret Manager. Needs to handle auto-scaling and secure database credentials.",
    mode: "design" as AppMode
  },
  {
    title: "Real-time Data Pipeline",
    prompt: "A streaming analytics platform that ingests IoT sensor data via Pub/Sub, processes it with Dataflow, and stores it in BigQuery for visualization.",
    mode: "design" as AppMode
  }
];

const SAMPLE_EXISTING = [
  {
    title: "Legacy VM Setup",
    content: `We have 3 Compute Engine VMs running a monolithic Node.js app.
- Database: 1 Compute Engine VM running MySQL (no replication, manual backups).
- Load Balancer: None (DNS points directly to one VM, others are manual fallbacks).
- Security: All VMs have public IPs, SSH ports open to 0.0.0.0/0.
- Cost: Running 24/7 on standard instances, monthly cost is around $400.`,
    mode: "review_existing" as AppMode
  },
  {
    title: "Basic Cloud Run API",
    content: `Architecture:
- Frontend: Hosted on Cloud Storage (Static Website).
- Backend: Cloud Run service (publicly accessible).
- Database: Cloud SQL for PostgreSQL (public IP enabled, authorized networks configured).
- Secrets: Hardcoded in Cloud Run environment variables.
- CI/CD: Manual deployments from developer laptops.`,
    mode: "review_existing" as AppMode
  }
];

// Guaranteed high-quality mock data for the Design & Review Quick Demo
const MOCK_DEMO_DESIGN: ArchitectureDesign = {
  mvp: {
    title: "MVP Serverless App: Minimal Cloud Run & Firestore Setup",
    summary: "An ultra-lean serverless setup designed for immediate, near-zero cost deployment. Compute runs on scale-to-zero Google Cloud Run. Structured data is persisted in serverless Cloud Firestore (NoSQL), which comes with a generous free tier. External traffic reaches the container directly via automatic HTTPS endpoints.",
    mermaid_diagram: `graph TD
    subgraph "External Access"
        A["Client / Browser"] --> B["Cloud Run Service (Public URL)"]
    end

    subgraph "Data Storage"
        B --> C["Firestore NoSQL Database (Serverless)"]
        B --> D["Cloud Storage Bucket (Public Assets)"]
    end

    style B fill:#4285F4,stroke:#000,stroke-width:2px,color:#fff
    style C fill:#34A853,stroke:#000,stroke-width:2px,color:#fff
    style D fill:#EA4335,stroke:#000,stroke-width:2px,color:#fff`,
    components: [
      "Cloud Run (Serverless Compute, Scale-to-Zero)",
      "Cloud Firestore (Serverless NoSQL Document Store)",
      "Cloud Storage (Standard Storage Bucket for static assets)"
    ],
    terraform_snippet: `provider "google" {
  project = "round-exchange-500614-m6"
  region  = "us-central1"
}

resource "google_cloud_run_service" "mvp_service" {
  name     = "mvp-api-service"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/round-exchange-500614-m6/mvp-api:latest"
      }
    }
  }
}

resource "google_firestore_database" "database" {
  name        = "(default)"
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"
}`,
    estimated_monthly_cost: "$5",
    design_decisions: [
      "Leveraged Cloud Run to ensure zero compute costs when idle.",
      "Used Firestore to bypass complex networking and fixed database instance billing.",
      "Omitted Load Balancers and Cloud NAT to minimize minimum spend to virtual zero."
    ]
  },
  growth: {
    title: "Growth Stage: Autoscale Cloud Run with HA Cloud SQL and CDN",
    summary: "Production-ready, highly available architecture tailored for medium-scale horizontal traffic. It scales Cloud Run across multiple container instances, fronted by a Global HTTP(S) Load Balancer with basic SSL termination. State is securely saved in a multi-zone Regional High Availability (HA) Cloud SQL PostgreSQL database.",
    mermaid_diagram: `graph TD
    subgraph "External Access"
        A["Client / App"] --> B("Global HTTP(S) Load Balancer")
    end

    subgraph "Compute Layer"
        B --> C["Cloud Run Container (Autoscaling)"]
    end

    subgraph "Data Storage"
        C --> D["Cloud SQL PostgreSQL (HA Multi-Zone)"]
        C --> E["Cloud Storage Bucket (Regional)"]
    end

    style C fill:#4285F4,stroke:#000,stroke-width:2px,color:#fff
    style D fill:#34A853,stroke:#000,stroke-width:2px,color:#fff
    style B fill:#FBBC05,stroke:#000,stroke-width:2px,color:#333`,
    components: [
      "Cloud Run (Min-Instances set to 1 to eliminate cold starts)",
      "Cloud SQL for PostgreSQL (Multi-Zone Regional High Availability)",
      "Global External HTTP(S) Load Balancer",
      "Cloud Storage (Regional Bucket with backup enabled)"
    ],
    terraform_snippet: `resource "google_sql_database_instance" "growth_postgres" {
  name             = "growth-db-instance"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier              = "db-f1-micro"
    availability_type = "REGIONAL" # High Availability Dual-Zone
    
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
  }
}`,
    estimated_monthly_cost: "$180",
    design_decisions: [
      "Enforced Regional HA Cloud SQL to guarantee automatic failover during zone outages.",
      "Fronted API compute with an external Load Balancer to abstract instance URLs and terminate SSL.",
      "Added Cloud Storage bucket automatic backups to meet data retention requirements."
    ]
  },
  enterprise: {
    title: "Enterprise Ready: Global Load Balancer, Cloud Armor WAF & Private VPC Networking",
    summary: "A global-scale, enterprise-ready architecture. It implements end-to-end security via completely private VPC networking, Secret Manager integration, and Cloud KMS key encryption. Traffic is fronted by a Global Load Balancer with Cloud Armor (WAF/DDoS) and Cloud CDN. Storage leverages high-availability global Spanner.",
    mermaid_diagram: `graph TD
    subgraph "External Security Edge"
        A["Client / App"] --> B("Global Load Balancer")
        B --> C["Cloud Armor (WAF/DDoS)"]
        B --> D["Cloud CDN (Edge Cache)"]
    end

    subgraph "Private VPC Boundary"
        C --> E["Cloud Run API Container"]
        E --> F["VPC Access Connector"]
    end

    subgraph "Secure Storage & KMS"
        F --> G["Cloud Spanner Database (Multi-Region)"]
        E --> H["Secret Manager"]
        E --> I["Cloud KMS (Key Rotation)"]
    end

    style E fill:#4285F4,stroke:#000,stroke-width:2px,color:#fff
    style G fill:#34A853,stroke:#000,stroke-width:2px,color:#fff
    style H fill:#EA4335,stroke:#000,stroke-width:2px,color:#fff
    style B fill:#FBBC05,stroke:#000,stroke-width:2px,color:#333`,
    components: [
      "Global Load Balancer with Cloud CDN & Cloud Armor Edge protection",
      "Cloud Run (Private access ingress, multi-region failover)",
      "Serverless VPC Access Connector",
      "Cloud Spanner (Multi-region globally consistent enterprise SQL database)",
      "Secret Manager & Cloud KMS (Encryption key rotation)",
      "Cloud Operations (Logging, Alerting, Security Command Center logs)"
    ],
    terraform_snippet: `resource "google_spanner_instance" "enterprise_db" {
  config       = "nam-eur-asia1"
  display_name = "Global Enterprise Spanner"
  num_nodes    = 1
}

resource "google_compute_security_policy" "cloud_armor" {
  name        = "waf-policy"
  description = "Block OWASP Top 10"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v933001-stable')"
      }
    }
  }
}`,
    estimated_monthly_cost: "$950",
    design_decisions: [
      "Deployed Google Cloud Armor to instantly mitigate web attacks and OWASP Top 10 vulnerabilities.",
      "Routed compute traffic through Serverless VPC Access to enable private IP-only access to backend services.",
      "Used Cloud KMS with continuous rotation rules to maintain state-of-the-art encryption standards."
    ]
  }
};

const MOCK_DEMO_REVIEW: ArchitectureReview = {
  mvp: {
    overall_score: 82,
    overall_verdict: "Outstanding lean design for MVP. Extremely cost-effective with zero overhead. Needs basic secret externalization if any database keys are added later.",
    security: [
      "PASSED: No complex server maintenance required (serverless Cloud Run runtime patches managed by Google).",
      "RECOMMENDED: Ensure IAM permissions for Cloud Run service accounts follow least-privilege principles."
    ],
    cost: [
      "PASSED: Fully scale-to-zero architecture keeps baseline costs at $0/month when idle."
    ],
    reliability: [
      "PASSED: Cloud Run automatically scales up and handles request queues.",
      "HIGH: Firestore has multi-region consistent copies, but single-region storage bucket is a potential single point of failure (SPOF) if the region goes down."
    ],
    top_3_actions: [
      "Restrict Cloud Run service account permissions.",
      "Add budget alerts to prevent accidental scaling bills.",
      "Implement client-side caching to reduce Firestore read counts."
    ]
  },
  growth: {
    overall_score: 90,
    overall_verdict: "High-quality regional production architecture with dual-zone database and external HTTP(S) load balancer.",
    security: [
      "PASSED: Global Load Balancer abstracts compute endpoints and enforces HTTPS.",
      "HIGH: Cloud SQL database has a public IP address enabled. Database authorization lists are used, but private IP is highly recommended."
    ],
    cost: [
      "PASSED: Auto-scaling on Cloud Run scales in dynamically to keep compute resource usage efficient."
    ],
    reliability: [
      "PASSED: Regional Cloud SQL HA protects state from any single-zone failures.",
      "RECOMMENDED: Configure Cloud Monitoring dashboards and alerts on database CPU and memory metrics."
    ],
    top_3_actions: [
      "Configure Private IP and Serverless VPC Access for the Cloud SQL database.",
      "Configure automated daily backup snapshots with a 30-day retention policy.",
      "Turn on basic cache-control headers on static Cloud Storage content."
    ]
  },
  enterprise: {
    overall_score: 96,
    overall_verdict: "Fully compliant, ironclad, global-scale architecture. Zero-trust private VPC and edge firewalling implemented flawlessly.",
    security: [
      "PASSED: Cloud Armor shields public edge. Cloud Run compute has private-ingress-only enabled.",
      "PASSED: Secret Manager securely injects credentials without environment leaks.",
      "PASSED: Serverless VPC Access Connector handles isolated private IP routing."
    ],
    cost: [
      "PASSED: Multi-region setup is highly cost-efficient compared to provisioning traditional redundant active-active servers.",
      "RECOMMENDED: Set Cloud CDN cache TTL values aggressively to optimize egress bandwidth cost."
    ],
    reliability: [
      "PASSED: Spanner provides global multi-region consistency with five-nines (99.999%) SLA.",
      "PASSED: Cloud Logging and Monitoring audit trails capture all infrastructure actions."
    ],
    top_3_actions: [
      "Configure regional failover traffic routing in Global HTTP(S) Load Balancer DNS policies.",
      "Enable Cloud KMS automated customer-managed encryption key (CMEK) rotation.",
      "Audit API ingress logs within Google Security Command Center (SCC)."
    ]
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mode: 'design',
    prompt: '',
    existingArchitecture: '',
    image: null,
    imageBase64: null,
    loading: false,
    loadingStep: '',
    designResult: null,
    reviewResult: null,
    error: null,
    activeTab: 'architecture',
    savedRuns: [],
    chatHistory: [],
    auditStrategy: 'default',
  });

  // Interactive Features State
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [personaExpanded, setPersonaExpanded] = useState(true);
  const [constraintsExpanded, setConstraintsExpanded] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [antigravityMode, setAntigravityMode] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [costMultiplier, setCostMultiplier] = useState(1);
  const [resolvedFindings, setResolvedFindings] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [diagramMode, setDiagramMode] = useState<'standard' | 'gcp'>('gcp');
  const [isViewportExpanded, setIsViewportExpanded] = useState(false);
  const [activeStage, setActiveStage] = useState<'mvp' | 'growth' | 'enterprise'>('mvp');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('infraoracle_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('infraoracle_theme', theme);
  }, [theme]);

  // GCP Live Scan Interactive Console State
  const [gcpToken, setGcpToken] = useState('');
  const [gcpProjects, setGcpProjects] = useState<{ projectId: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [scanTypes, setScanTypes] = useState({ run: true, sql: true, gce: true, gcs: true });
  const [gcpLogs, setGcpLogs] = useState<string[]>([]);
  const [isGcpConnecting, setIsGcpConnecting] = useState(false);
  const [isGcpScanning, setIsGcpScanning] = useState(false);
  const [showGcpScanner, setShowGcpScanner] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);
  const [gcpError, setGcpError] = useState<string | null>(null);

  const handleGcpConnect = async (useMock = false) => {
    setIsGcpConnecting(true);
    setGcpError(null);
    setGcpLogs(["Initializing GCP Authentication handshake...", "Requesting accessible cloud projects..."]);
    
    try {
      if (useMock || gcpToken.trim().toLowerCase() === 'mock' || gcpToken.trim().toLowerCase() === 'demo') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGcpProjects([
          { projectId: 'infraoracle-enterprise-prod', name: 'Enterprise Production Project' },
          { projectId: 'infraoracle-growth-staging', name: 'Staging Environment' },
          { projectId: 'infraoracle-mvp-dev', name: 'Development Sandbox' }
        ]);
        setSelectedProject('infraoracle-enterprise-prod');
        setGcpLogs(prev => [...prev, "[✓] Success: Loaded 3 mock projects."]);
        setIsGcpConnecting(false);
        return;
      }

      if (!gcpToken.trim()) {
        throw new Error("Access token is empty. Please paste an access token or type 'mock' to demo.");
      }

      const projects = await listGcpProjects(gcpToken.trim());
      setGcpProjects(projects);
      if (projects.length > 0) {
        setSelectedProject(projects[0].projectId);
      }
      setGcpLogs(prev => [...prev, `[✓] Success: Loaded ${projects.length} cloud projects.`]);
    } catch (err: any) {
      console.error(err);
      setGcpError(err.message || 'Handshake failed.');
      setGcpLogs(prev => [...prev, `[❌] Error: ${err.message || 'Handshake failed.'}`]);
    } finally {
      setIsGcpConnecting(false);
    }
  };

  const handleGcpScan = async (useMock = false) => {
    setIsGcpScanning(true);
    setGcpError(null);
    setGcpLogs([]);

    const logProgress = (msg: string) => {
      setGcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      if (useMock || gcpToken.trim().toLowerCase() === 'mock' || gcpToken.trim().toLowerCase() === 'demo' || selectedProject.startsWith('infraoracle-')) {
        logProgress(`Initiating mock resources query for project: ${selectedProject}...`);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockResult = {
          projectId: selectedProject,
          cloudRunServices: scanTypes.run ? [
            { name: "checkout-api", region: "us-central1", ingress: "internal-and-cloud-load-balancing", minInstances: 1, maxInstances: 10, uri: "https://checkout-api-ykj28-uc.a.run.app" },
            { name: "auth-service", region: "us-central1", ingress: "all", minInstances: 0, maxInstances: 5, uri: "https://auth-service-ykj28-uc.a.run.app" }
          ] : [],
          cloudSqlInstances: scanTypes.sql ? [
            { name: "postgres-main", databaseVersion: "POSTGRES_15", tier: "db-custom-2-7680", region: "us-central1", gceZone: "us-central1-a", haEnabled: true, publicIpEnabled: false }
          ] : [],
          computeInstances: scanTypes.gce ? [
            { name: "legacy-bastion-host", zone: "us-central1-f", machineType: "e2-medium", status: "RUNNING" }
          ] : [],
          storageBuckets: scanTypes.gcs ? [
            { name: "enterprise-user-uploads-bucket", location: "us-central1", storageClass: "STANDARD", lifecycleRulesCount: 2 }
          ] : []
        };

        if (scanTypes.run) {
          logProgress("Scanning Cloud Run services (all locations)...");
          await new Promise(resolve => setTimeout(resolve, 600));
          logProgress(`[✓] Cloud Run scanning complete. Found ${mockResult.cloudRunServices.length} services.`);
        }
        if (scanTypes.sql) {
          logProgress("Scanning Cloud SQL databases...");
          await new Promise(resolve => setTimeout(resolve, 600));
          logProgress(`[✓] Cloud SQL scanning complete. Found ${mockResult.cloudSqlInstances.length} instances.`);
        }
        if (scanTypes.gce) {
          logProgress("Scanning Compute Engine VM instances...");
          await new Promise(resolve => setTimeout(resolve, 600));
          logProgress(`[✓] Compute Engine scanning complete. Found ${mockResult.computeInstances.length} instances.`);
        }
        if (scanTypes.gcs) {
          logProgress("Scanning Cloud Storage buckets...");
          await new Promise(resolve => setTimeout(resolve, 600));
          logProgress(`[✓] Cloud Storage scanning complete. Found ${mockResult.storageBuckets.length} buckets.`);
        }

        const mdResult = formatScanResultToMarkdown(mockResult);
        setState(prev => ({ ...prev, existingArchitecture: mdResult }));
        logProgress("[✓] Real-time compilation finished. Exported schema to text input!");
        setIsGcpScanning(false);
        return;
      }

      logProgress(`Starting live scan against GCP project: "${selectedProject}"...`);
      const result = await scanProjectResources(selectedProject, gcpToken.trim(), logProgress, scanTypes);
      const formattedMarkdown = formatScanResultToMarkdown(result);
      
      setState(prev => ({ ...prev, existingArchitecture: formattedMarkdown }));
      logProgress("[✓] Real-time resource scan complete! Dynamic spec generated.");
    } catch (err: any) {
      console.error(err);
      setGcpError(err.message || 'Scan failed.');
      logProgress(`[❌] Scan failed: ${err.message || 'Scan failed.'}`);
    } finally {
      setIsGcpScanning(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved runs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('infraoracle_runs_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, savedRuns: parsed }));
      } catch (e) {
        console.error("Failed to parse saved runs", e);
      }
    }
  }, []);

  // Scroll to bottom of chat feed when history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory, state.loading]);

  const saveRun = (mode: AppMode, title: string, prompt: string, design: ArchitectureDesign | null, review: ArchitectureReview | null, chatHistory: ChatTurn[]) => {
    const newRun: SavedRun = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      mode,
      title,
      prompt,
      existingArchitecture: mode === 'review_existing' ? state.existingArchitecture : undefined,
      designResult: design,
      reviewResult: review,
      chatHistory,
      auditStrategy: state.auditStrategy
    };

    const updatedRuns = [newRun, ...state.savedRuns].slice(0, 20); // Keep last 20 runs
    setState(prev => ({ ...prev, savedRuns: updatedRuns }));
    localStorage.setItem('infraoracle_runs_v2', JSON.stringify(updatedRuns));
  };

  const deleteRun = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRuns = state.savedRuns.filter(run => run.id !== id);
    setState(prev => ({ ...prev, savedRuns: updatedRuns }));
    localStorage.setItem('infraoracle_runs_v2', JSON.stringify(updatedRuns));
  };

  const loadRun = (run: SavedRun) => {
    const history = run.chatHistory || [
      {
        id: 'legacy-1',
        role: 'user',
        text: run.mode === 'design' ? run.prompt : (run.existingArchitecture || run.prompt),
        timestamp: run.timestamp
      },
      {
        id: 'legacy-2',
        role: 'assistant',
        text: run.mode === 'design' ? `Here is the architecture design and review for "${run.title}":` : `Here is the security, cost, and reliability review of your existing environment:`,
        designResult: run.designResult,
        reviewResult: run.reviewResult,
        timestamp: run.timestamp
      }
    ] as ChatTurn[];

    // Find latest assistant turn with reviewResult to select
    const lastAssistantWithReview = [...history].reverse().find(t => t.role === 'assistant' && t.reviewResult);

    setState(prev => ({
      ...prev,
      mode: run.mode,
      prompt: '',
      existingArchitecture: '',
      chatHistory: history,
      designResult: lastAssistantWithReview?.designResult || null,
      reviewResult: lastAssistantWithReview?.reviewResult || null,
      activeTab: run.mode === 'design' && lastAssistantWithReview?.designResult ? 'architecture' : 'review',
      auditStrategy: run.auditStrategy || 'default',
      error: null
    }));

    setSelectedTurnId(lastAssistantWithReview?.id || null);
    setResolvedFindings({});
    setCostMultiplier(1);
  };

  // Load the Quick Demo instantly
  const loadQuickDemo = () => {
    const demoPrompt = 'Design a secure, highly available serverless API on Google Cloud with database and secrets management.';
    
    const userTurn: ChatTurn = {
      id: 'demo-user',
      role: 'user',
      text: demoPrompt,
      timestamp: new Date().toLocaleTimeString(),
      constraints: ['more secure', 'enterprise ready', 'cheapest']
    };

    const assistantTurn: ChatTurn = {
      id: 'demo-assistant',
      role: 'assistant',
      text: 'I have designed a highly-secure, cost-effective serverless architecture utilizing Google Cloud Run, Regional Cloud SQL (PostgreSQL HA), and Secret Manager, fully shielded by Global HTTPS Load Balancing and Google Cloud Armor. Here is the architecture layout, components audit, and review report:',
      designResult: MOCK_DEMO_DESIGN,
      reviewResult: MOCK_DEMO_REVIEW,
      timestamp: new Date().toLocaleTimeString()
    };

    setState(prev => ({
      ...prev,
      mode: 'design',
      prompt: '',
      chatHistory: [userTurn, assistantTurn],
      designResult: MOCK_DEMO_DESIGN,
      reviewResult: MOCK_DEMO_REVIEW,
      activeTab: 'architecture',
      error: null
    }));

    setSelectedTurnId('demo-assistant');
    setResolvedFindings({});
    setCostMultiplier(1);
    setSelectedConstraints(['more secure', 'enterprise ready', 'cheapest']);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, prompt: e.target.value }));
  };

  const handleExistingChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, existingArchitecture: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setState(prev => ({ 
        ...prev, 
        image: file,
        imageBase64: base64Data
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleWhiteboardSave = (base64Data: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], "whiteboard-sketch.png", { type: "image/png" });

    setState(prev => ({
      ...prev,
      image: file,
      imageBase64: base64Data
    }));
    setShowWhiteboard(false);
  };

  const removeImage = () => {
    setState(prev => ({ ...prev, image: null, imageBase64: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const simulateAgentLogs = async () => {
    let logs = [
      "Initializing Antigravity Remote Sandbox Node Runtime...",
      "Mounting local workspace configurations...",
      "Establishing authenticated Vertex AI proxy bridge..."
    ];

    if (state.auditStrategy === 'chaos_monkey') {
      logs.push(
        "Activated Antigravity Chaos Monkey strategy engine...",
        "Scanning for single-points-of-failure (SPOF) and zonal bottlenecks...",
        "Simulating compute-node scale outage in us-central1-b...",
        "Measuring database failover RTO under regional traffic spike...",
        "Formulating disaster recovery recommendations and chaos metrics..."
      );
    } else if (state.auditStrategy === 'finops') {
      logs.push(
        "Activated Antigravity FinOps cost intelligence scanner...",
        "Auditing compute instance usage & scaling parameters...",
        "Analyzing storage class lifecycle policy definitions...",
        "Formulating commitment discount schedules & spot pricing fallbacks...",
        "Calculating cost-minimization vectors and scaled MAU metrics..."
      );
    } else if (state.auditStrategy === 'zero_trust') {
      logs.push(
        "Activated Zero-Trust secure perimeter hardening engine...",
        "Scanning public IP network interfaces and authorized networks...",
        "Checking IAM service account privilege scopes and roles...",
        "Inspecting Cloud KMS CMEK encryption-at-rest policies...",
        "Evaluating Secret Manager environment credentials & Cloud Armor rules..."
      );
    } else {
      logs.push(
        "Executing security audit scanner against active design constraints...",
        "Formulating cost vectors and estimated monthly resource quotas...",
        "Running multi-zone high availability (HA) reliability simulation...",
        "Injecting compliance findings & generating starter Terraform manifests..."
      );
    }

    setAgentLogs([]);
    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logs[i]}`]);
    }
  };

  const handleToggleConstraint = (id: string) => {
    setSelectedConstraints(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectTurn = (turn: ChatTurn) => {
    if (turn.role === 'assistant') {
      setState(prev => ({
        ...prev,
        designResult: turn.designResult || null,
        reviewResult: turn.reviewResult || null,
        activeTab: state.mode === 'design' && turn.designResult ? 'architecture' : 'review'
      }));
      setSelectedTurnId(turn.id);
    }
  };

  const handleAnalyze = async () => {
    const isDesign = state.mode === 'design';
    const inputVal = isDesign ? state.prompt : state.existingArchitecture;

    if (!inputVal.trim() && !state.image) {
      setState(prev => ({ 
        ...prev, 
        error: `Please provide ${isDesign ? 'a prompt' : 'existing architecture text'} or paint a whiteboard sketch.` 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      loadingStep: isDesign ? 'Designing cloud architecture...' : 'Auditing existing architecture...'
    }));

    if (antigravityMode) {
      simulateAgentLogs();
    }

    const currentTurnId = Math.random().toString(36).substr(2, 9);
    const userTurn: ChatTurn = {
      id: `turn-user-${currentTurnId}`,
      role: 'user',
      text: inputVal,
      image: state.image && state.imageBase64 ? {
        data: state.imageBase64,
        mime_type: state.image.type
      } : null,
      constraints: [...selectedConstraints],
      auditStrategy: state.auditStrategy,
      timestamp: new Date().toLocaleTimeString()
    };

    // Update history with user's question first
    const updatedHistoryWithUser = [...state.chatHistory, userTurn];
    setState(prev => ({
      ...prev,
      chatHistory: updatedHistoryWithUser,
      prompt: '',
      existingArchitecture: '',
      image: null,
      imageBase64: null
    }));

    try {
      const mimeType = userTurn.image ? userTurn.image.mime_type : null;
      const base64Data = userTurn.image ? userTurn.image.data : null;

      let design: ArchitectureDesign | null = null;
      let review: ArchitectureReview | null = null;

      const activeStrategy = antigravityMode ? state.auditStrategy : 'default';

      if (isDesign) {
        design = await generateArchitecture(userTurn.text, base64Data, mimeType, state.chatHistory, selectedConstraints, activeStrategy);
        
        setState(prev => ({ 
          ...prev, 
          loadingStep: antigravityMode 
            ? 'Deploying secure Antigravity Remote Sandbox...' 
            : 'Analyzing design options for Security, Cost, and Reliability...'
        }));

        review = await reviewArchitecture(design, selectedConstraints, activeStrategy);
      } else {
        review = await reviewExistingArchitecture(userTurn.text, base64Data, mimeType, selectedConstraints, activeStrategy);
      }

      const assistantTurn: ChatTurn = {
        id: `turn-assistant-${currentTurnId}`,
        role: 'assistant',
        text: isDesign 
          ? `I have designed a custom Google Cloud architecture based on your request, optimized according to the active constraints: ${selectedConstraints.join(', ') || 'none'}.`
          : `I have audited your existing system details and compiled a detailed report. Here is the review rating and findings:`,
        designResult: design,
        reviewResult: review,
        timestamp: new Date().toLocaleTimeString()
      };

      const finalHistory = [...updatedHistoryWithUser, assistantTurn];

      setState(prev => ({ 
        ...prev, 
        chatHistory: finalHistory,
        designResult: design,
        reviewResult: review,
        loading: false,
        loadingStep: '',
        activeTab: isDesign ? 'architecture' : 'review'
      }));

      setSelectedTurnId(assistantTurn.id);
      setResolvedFindings({});
      setCostMultiplier(1);

      const runTitle = isDesign ? (design?.[activeStage]?.title || 'Generated Cloud Setup') : `Review: ${userTurn.text.substring(0, 30)}...`;
      saveRun(state.mode, runTitle, userTurn.text, design, review, finalHistory);

    } catch (err: any) {
      console.error("Analysis failed:", err);
      
      // Add error message as bot response so the user doesn't lose conversation
      const errorTurn: ChatTurn = {
        id: `turn-error-${currentTurnId}`,
        role: 'assistant',
        text: `Error processing request: ${err.message || 'An unexpected API error occurred.'} Ensure Application Default Credentials (ADC) are configured by running 'gcloud auth application-default login'.`,
        timestamp: new Date().toLocaleTimeString()
      };

      setState(prev => ({ 
        ...prev, 
        chatHistory: [...updatedHistoryWithUser, errorTurn],
        loading: false, 
        loadingStep: '',
        error: err.message || 'An unexpected error occurred.' 
      }));
    }
  };

  const handleCopyTerraform = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFinding = (key: string) => {
    setResolvedFindings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getReadinessScore = () => {
    if (!state.reviewResult) return 0;
    const currentReview = state.reviewResult[activeStage];
    const totalFindings = 3 + currentReview.security.length + currentReview.cost.length + currentReview.reliability.length;
    const resolvedCount = Object.values(resolvedFindings).filter(Boolean).length;
    const baseScore = currentReview.overall_score;
    const remainingPoints = 100 - baseScore;
    const progressFraction = totalFindings > 0 ? resolvedCount / totalFindings : 0;
    return Math.min(100, Math.round(baseScore + (remainingPoints * progressFraction)));
  };

  const parseCost = (costStr: string): number => {
    const match = costStr.match(/\$?(\d+)/);
    return match ? parseInt(match[1], 10) : 150;
  };

  const getScaledCost = () => {
    if (!state.designResult) return '$0';
    const baseCost = parseCost(state.designResult[activeStage].estimated_monthly_cost);
    const scaled = baseCost * costMultiplier;
    return `$${scaled.toLocaleString()}`;
  };

  const exportReportAsMarkdown = () => {
    const { designResult, reviewResult } = state;
    if (!reviewResult) return;

    let md = `# InfraOracle Architecture Time Machine Audit Report\n`;
    md += `Generated on: ${new Date().toLocaleString()}\n\n`;

    const stages: ('mvp' | 'growth' | 'enterprise')[] = ['mvp', 'growth', 'enterprise'];

    for (const stage of stages) {
      const stageDesign = designResult?.[stage];
      const stageReview = reviewResult[stage];
      const stageName = stage.toUpperCase();

      md += `\n# ==========================================\n`;
      md += `# PHASE: ${stageName}\n`;
      md += `# ==========================================\n\n`;
      md += `**Review Verdict:** ${stageReview.overall_verdict}\n`;
      md += `**Overall Audit Score:** ${stageReview.overall_score}/100\n\n`;

      if (stageDesign) {
        md += `## Design: ${stageDesign.title}\n`;
        md += `### High-Level Summary\n${stageDesign.summary}\n\n`;
        md += `### Estimated Base Cost\n${stageDesign.estimated_monthly_cost}/month\n\n`;
        md += `### Key Architectural Decisions\n`;
        stageDesign.design_decisions.forEach(d => md += `- ${d}\n`);
        md += `\n### GCP Components Deployed\n`;
        stageDesign.components.forEach(c => md += `- ${c}\n`);
        md += `\n`;
      }

      md += `## Vulnerability & Optimization Audit\n`;
      md += `### Top 3 Actions Required\n`;
      stageReview.top_3_actions.forEach((a, i) => md += `${i + 1}. ${a}\n`);
      md += `\n`;

      md += `### Detailed Category Findings\n`;
      md += `#### Security Controls\n`;
      stageReview.security.forEach(s => md += `- ${s}\n`);
      md += `\n#### Cost Optimizations\n`;
      stageReview.cost.forEach(c => md += `- ${c}\n`);
      md += `\n#### Reliability & Scaling\n`;
      stageReview.reliability.forEach(r => md += `- ${r}\n`);
      md += `\n`;

      if (stageDesign?.terraform_snippet) {
        md += `## Starter Terraform Manifest\n\`\`\`hcl\n${stageDesign.terraform_snippet}\n\`\`\`\n\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infraoracle-timemachine-audit-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderArchitectureTab = () => {
    const { designResult } = state;
    if (!designResult) return null;

    const currentStage = designResult[activeStage];

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Premium Contextual Banner */}
        <div className="bg-gradient-to-r from-cyan-950/20 via-slate-900/30 to-slate-900/35 border border-cyan-500/15 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300 shadow-[0_0_15px_rgba(6,182,212,0.01)] animate-fadeIn">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
              Interactive Design Guide
            </span>
            <p className="text-slate-400">
              This tab displays the live network topology generated for your cloud specification. Toggle between the <strong className="text-cyan-300">GCP Mesh View</strong> to inspect actual Google component icons, or the <strong className="text-cyan-300">Standard (Mermaid) View</strong> to see classic sequence structures. Click <strong className="text-cyan-300">Expand View</strong> to maximize your spatial canvas.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <LayoutTemplate className="w-4.5 h-4.5 text-cyan-400" />
              Interactive Topology Diagram
            </h3>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Expand / Contract Toggle Button */}
              <button
                onClick={() => setIsViewportExpanded(!isViewportExpanded)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all shadow-sm ${
                  isViewportExpanded
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
                title={isViewportExpanded ? "Contract Canvas Height" : "Expand Canvas Height"}
              >
                {isViewportExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Contract View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand View</span>
                  </>
                )}
              </button>

              {/* Diagram Mode Selection Toggle */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit shadow-inner">
                <button
                  onClick={() => setDiagramMode('gcp')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    diagramMode === 'gcp'
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/15 text-cyan-400 border border-cyan-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  GCP Mesh View
                </button>
                <button
                  onClick={() => setDiagramMode('standard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    diagramMode === 'standard'
                      ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-slate-200 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Standard (Mermaid)
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-4 bg-slate-950/40 rounded-xl border border-slate-800/50 transition-all duration-300">
            {diagramMode === 'gcp' ? (
              <GcpNetworkTopology chart={currentStage.mermaid_diagram} isExpanded={isViewportExpanded} />
            ) : (
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-900">
                <MermaidDiagram chart={currentStage.mermaid_diagram} isExpanded={isViewportExpanded} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Server className="w-4.5 h-4.5 text-emerald-400" />
              GCP Component Inventory
            </h3>
            <ul className="space-y-2.5">
              {currentStage.components.map((comp, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shadow-[0_0_8px_#22d3ee]" />
                  <span>{comp}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <DollarSign className="w-4.5 h-4.5 text-amber-400" />
                Cost Scaling Calculator
              </h3>
              <p className="text-xs text-slate-500 mb-4">Estimate dynamic monthly budgets by scaling traffic volume.</p>
            </div>
            
            <div className="my-3">
              <div className="text-4xl font-extrabold text-white flex items-baseline gap-1 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 w-full justify-center">
                <span>{getScaledCost()}</span>
                <span className="text-xs text-slate-500 font-normal">/ month</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Monthly Active Users (MAU):</span>
                <span className="text-cyan-400">{costMultiplier === 1 ? 'Dev (1x)' : costMultiplier === 5 ? 'Growth (5x)' : costMultiplier === 10 ? 'Scale (10x)' : 'Enterprise (50x)'}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="1"
                value={costMultiplier === 1 ? 1 : costMultiplier === 5 ? 2 : costMultiplier === 10 ? 3 : 4}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCostMultiplier(val === 1 ? 1 : val === 2 ? 5 : val === 3 ? 10 : 50);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1k MAU</span>
                <span>50k MAU</span>
                <span>250k MAU</span>
                <span>1M+ MAU</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Critical Design Decisions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentStage.design_decisions.map((decision, idx) => (
              <div key={idx} className="flex gap-3 text-slate-300 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>{decision}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReviewTab = () => {
    const { reviewResult } = state;
    if (!reviewResult) return null;

    const currentReview = reviewResult[activeStage];

    const getScoreColor = (score: number) => {
      if (score >= 85) return 'text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(52,168,83,0.15)]';
      if (score >= 65) return 'text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,188,5,0.15)]';
      return 'text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(234,67,53,0.15)]';
    };

    const readinessScore = getReadinessScore();

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Premium Contextual Banner */}
        <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/30 to-slate-900/35 border border-emerald-500/15 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300 shadow-[0_0_15px_rgba(16,185,129,0.01)] animate-fadeIn">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
              Production-Readiness Auditor
            </span>
            <p className="text-slate-400">
              Analyze your infrastructure vulnerabilities across <strong className="text-emerald-300">Security</strong>, <strong className="text-emerald-300">Cost</strong>, and <strong className="text-emerald-300">Reliability</strong>. Track your progress dynamically: as you solve findings, <strong className="text-emerald-300">tick off the checkboxes</strong> next to them to increase your overall Readiness Score in real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-slate-950/60 p-6 rounded-2xl border text-center flex flex-col justify-center items-center ${getScoreColor(currentReview.overall_score)}`}>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Architecture Grade</div>
            <div className="text-5xl font-black">{currentReview.overall_score}</div>
            <div className="text-xs text-slate-500 mt-1">out of 100</div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 md:col-span-2 flex flex-col justify-center backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                <ClipboardList className="w-4.5 h-4.5 text-cyan-400" />
                Remediation Progress Tracker
              </span>
              <span className="text-lg font-bold text-cyan-400">{readinessScore}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-700 shadow-[0_0_12px_#06b6d4]"
                style={{ width: `${readinessScore}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Solve findings below and tick them off to dynamically monitor development production-readiness.</p>
          </div>
        </div>

        {/* Live Antigravity Auditing Persona Card */}
        {antigravityMode && (() => {
          const strat = state.auditStrategy || 'default';
          const strategyMap: Record<AuditStrategy, { label: string; icon: any; color: string; bg: string; borderColor: string; desc: string }> = {
            default: { 
              label: 'Core Principal Architect Stance', 
              icon: Bot, 
              color: 'text-cyan-400', 
              bg: 'bg-cyan-500/5', 
              borderColor: 'border-cyan-500/10', 
              desc: 'This audit uses balanced corporate cloud design parameters. Focuses on regional reliability, standard security perimeters, and modular cost tiers.' 
            },
            chaos_monkey: { 
              label: 'The Chaos Monkey Auditing Engine', 
              icon: Activity, 
              color: 'text-rose-400', 
              bg: 'bg-rose-500/5', 
              borderColor: 'border-rose-500/10', 
              desc: 'This audit uses high-disaster resilience auditing parameters. Actively searching for Single-Points-of-Failure (SPOFs), cross-zone failover risks, and disaster recovery gaps.' 
            },
            finops: { 
              label: 'The FinOps Auditor CostGuard Stance', 
              icon: DollarSign, 
              color: 'text-emerald-400', 
              bg: 'bg-emerald-500/5', 
              borderColor: 'border-emerald-500/10', 
              desc: 'This audit focuses strictly on high-density resource optimization, highlighting over-provisioned VMs, missing lifecycle rules, and scale-to-zero serverless opportunities.' 
            },
            zero_trust: { 
              label: 'The Zero-Trust Hardener Secure Stance', 
              icon: ShieldCheck, 
              color: 'text-indigo-400', 
              bg: 'bg-indigo-500/5', 
              borderColor: 'border-indigo-500/10', 
              desc: 'This audit enforces maximum security containment, checking for public IP exposure, un-rotated Cloud KMS keys, public network ingress, and loose IAM privilege boundaries.' 
            }
          };
          const currentStrat = strategyMap[strat];
          const IconComp = currentStrat.icon;
          return (
            <div className={`p-5 rounded-2xl border ${currentStrat.borderColor} ${currentStrat.bg} backdrop-blur-md flex flex-col md:flex-row items-start md:items-center gap-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] animate-fadeIn`}>
              <div className={`p-3 rounded-xl bg-slate-950/80 border ${currentStrat.borderColor} ${currentStrat.color} flex-shrink-0 shadow-inner`}>
                <IconComp className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Audit Stance</span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-950/60 border ${currentStrat.borderColor} ${currentStrat.color}`}>
                    {strat === 'default' ? 'CORE' : strat.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">{currentStrat.label}</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{currentStrat.desc}</p>
              </div>
            </div>
          );
        })()}

        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Review Summary</h3>
          <p className="text-slate-200 text-sm leading-relaxed">{currentReview.overall_verdict}</p>
        </div>


        <div className="bg-rose-950/20 p-6 rounded-2xl border border-rose-900/40">
          <h3 className="text-sm font-semibold text-rose-300 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            Top 3 Action Items Required
          </h3>
          <ul className="space-y-3">
            {currentReview.top_3_actions.map((action, idx) => {
              const key = `action-${idx}`;
              return (
                <li key={idx} className="flex items-start gap-3 text-rose-200 text-sm">
                  <input 
                    type="checkbox" 
                    checked={!!resolvedFindings[key]}
                    onChange={() => toggleFinding(key)}
                    className="mt-0.5 rounded border-rose-800 text-rose-500 bg-slate-950/80 focus:ring-rose-500 focus:ring-offset-slate-900 h-4.5 w-4.5 cursor-pointer"
                  />
                  <span className={resolvedFindings[key] ? 'line-through text-slate-500' : ''}>
                    <span className="font-bold text-rose-400 mr-2">{idx + 1}.</span>
                    {action}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
              Security Compliance
            </h3>
            <ul className="space-y-3">
              {currentReview.security.map((item, idx) => {
                const key = `sec-${idx}`;
                const isPassed = item.toLowerCase().includes('passed:');
                const cleanText = item.replace(/PASSED:|RECOMMENDED:|CRITICAL:|HIGH:|MEDIUM:|LOW:/gi, '').trim();
                const typeText = item.split(':')[0] || 'INFO';
                
                return (
                  <li key={idx} className="flex gap-2.5 text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={!!resolvedFindings[key]}
                      onChange={() => toggleFinding(key)}
                      className="mt-0.5 rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-cyan-500 h-4 w-4 cursor-pointer flex-shrink-0"
                    />
                    <div className={resolvedFindings[key] ? 'line-through text-slate-500' : ''}>
                      <span className={`font-semibold mr-1.5 px-1.5 py-0.5 rounded text-[9px] ${
                        isPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {typeText}
                      </span>
                      <span>{cleanText}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
              Cost Guardrails
            </h3>
            <ul className="space-y-3">
              {currentReview.cost.map((item, idx) => {
                const key = `cost-${idx}`;
                const isPassed = item.toLowerCase().includes('passed:');
                const cleanText = item.replace(/PASSED:|RECOMMENDED:|CRITICAL:|HIGH:|MEDIUM:|LOW:/gi, '').trim();
                const typeText = item.split(':')[0] || 'INFO';

                return (
                  <li key={idx} className="flex gap-2.5 text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={!!resolvedFindings[key]}
                      onChange={() => toggleFinding(key)}
                      className="mt-0.5 rounded border-slate-800 text-emerald-500 bg-slate-950 focus:ring-emerald-500 h-4 w-4 cursor-pointer flex-shrink-0"
                    />
                    <div className={resolvedFindings[key] ? 'line-through text-slate-500' : ''}>
                      <span className={`font-semibold mr-1.5 px-1.5 py-0.5 rounded text-[9px] ${
                        isPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {typeText}
                      </span>
                      <span>{cleanText}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
              <Activity className="w-4.5 h-4.5 text-amber-400" />
              Reliability & HA
            </h3>
            <ul className="space-y-3">
              {currentReview.reliability.map((item, idx) => {
                const key = `rel-${idx}`;
                const isPassed = item.toLowerCase().includes('passed:');
                const cleanText = item.replace(/PASSED:|RECOMMENDED:|CRITICAL:|HIGH:|MEDIUM:|LOW:/gi, '').trim();
                const typeText = item.split(':')[0] || 'INFO';

                return (
                  <li key={idx} className="flex gap-2.5 text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={!!resolvedFindings[key]}
                      onChange={() => toggleFinding(key)}
                      className="mt-0.5 rounded border-slate-800 text-amber-500 bg-slate-950 focus:ring-amber-500 h-4 w-4 cursor-pointer flex-shrink-0"
                    />
                    <div className={resolvedFindings[key] ? 'line-through text-slate-500' : ''}>
                      <span className={`font-semibold mr-1.5 px-1.5 py-0.5 rounded text-[9px] ${
                        isPassed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {typeText}
                      </span>
                      <span>{cleanText}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderTerraformTab = () => {
    const { designResult } = state;
    if (!designResult) return null;

    const currentStage = designResult[activeStage];

    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Premium Contextual Banner */}
        <div className="bg-gradient-to-r from-indigo-950/20 via-slate-900/30 to-slate-900/35 border border-indigo-500/15 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300 shadow-[0_0_15px_rgba(99,102,241,0.01)] animate-fadeIn">
          <Code2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
              Infrastructure-as-Code Manifest
            </span>
            <p className="text-slate-400">
              This starter HCL manifest is dynamically synthesized to match your target stage specifications. Copy the configuration directly or export the entire report as standard Markdown to run deployment sequences in your local CLI terminal.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Code2 className="w-4.5 h-4.5 text-cyan-400" />
            Infrastructure-as-Code Manifest (Terraform)
          </h3>
          <button 
            onClick={() => handleCopyTerraform(currentStage.terraform_snippet)}
            className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold px-3 py-1.5 rounded-lg border border-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 overflow-x-auto">
          <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap leading-relaxed">
            {currentStage.terraform_snippet}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden font-sans relative transition-colors duration-300 ${theme === 'light' ? 'light-theme bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'}`}>
      {/* GLOWING AMBIENT BLOB BACKGROUNDS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[180px] pointer-events-none" />
      
      {/* Inject custom scrollbar and animation styles */}
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .glass-card { background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        .chat-input-focus:focus-within { border-color: rgba(6, 182, 212, 0.5) !important; box-shadow: 0 0 15px rgba(6, 182, 212, 0.15); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow 15s linear infinite; }

        /* LIGHT THEME OVERRIDES */
        .light-theme {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        .light-theme .glass-card {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-color: #e2e8f0 !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
        }
        /* Top Navigation Header Override */
        .light-theme .sticky {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: #e2e8f0 !important;
        }
        .light-theme .sticky h1 {
          color: #0f172a !important;
        }
        .light-theme .sticky p {
          color: #64748b !important;
        }
        
        /* Typography overrides */
        .light-theme h1, .light-theme h2, .light-theme h3, .light-theme h4, .light-theme h5, .light-theme h6 {
          color: #0f172a !important;
        }
        .light-theme .text-slate-100 { color: #0f172a !important; }
        .light-theme .text-slate-200 { color: #1e293b !important; }
        .light-theme .text-slate-300 { color: #334155 !important; }
        .light-theme .text-slate-400 { color: #475569 !important; }
        .light-theme .text-slate-500 { color: #64748b !important; }
        .light-theme .text-white { color: #0f172a !important; }
        
        /* Background Overrides - remove muddy grey container backgrounds completely */
        .light-theme .bg-slate-950,
        .light-theme .bg-slate-900,
        .light-theme .bg-slate-955,
        .light-theme .bg-slate-900\/95,
        .light-theme .bg-slate-900\/90,
        .light-theme .bg-slate-900\/80,
        .light-theme .bg-slate-900\/60,
        .light-theme .bg-slate-900\/50,
        .light-theme .bg-slate-900\/40,
        .light-theme .bg-slate-900\/30,
        .light-theme .bg-slate-900\/20,
        .light-theme .bg-slate-900\/10,
        .light-theme .bg-slate-900\/5,
        .light-theme .bg-slate-950\/95,
        .light-theme .bg-slate-950\/90,
        .light-theme .bg-slate-950\/85,
        .light-theme .bg-slate-950\/80,
        .light-theme .bg-slate-950\/75,
        .light-theme .bg-slate-950\/70,
        .light-theme .bg-slate-950\/60,
        .light-theme .bg-slate-950\/50,
        .light-theme .bg-slate-950\/40,
        .light-theme .bg-slate-950\/30,
        .light-theme .bg-slate-950\/20,
        .light-theme .bg-slate-950\/10,
        .light-theme .bg-slate-950\/5 {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }

        /* Hover background overrides */
        .light-theme .hover\:bg-slate-950:hover,
        .light-theme .hover\:bg-slate-900:hover,
        .light-theme .hover\:bg-slate-850:hover,
        .light-theme .hover\:bg-slate-800:hover,
        .light-theme .hover\:bg-slate-700:hover,
        .light-theme .hover\:bg-slate-900\/60:hover,
        .light-theme .hover\:bg-slate-900\/50:hover,
        .light-theme .hover\:bg-slate-900\/40:hover,
        .light-theme .hover\:bg-slate-900\/30:hover {
          background-color: #f1f5f9 !important;
        }

        /* Hover text overrides to prevent disappearing text on white bg */
        .light-theme .hover\:text-white:hover { color: #0f172a !important; }
        .light-theme .hover\:text-slate-100:hover { color: #0f172a !important; }
        .light-theme .hover\:text-slate-200:hover { color: #1e293b !important; }
        .light-theme .hover\:text-slate-300:hover { color: #334155 !important; }
        .light-theme .hover\:text-slate-400:hover { color: #475569 !important; }

        /* Group hover and button hover overrides */
        .light-theme .group:hover .group-hover\:text-white,
        .light-theme button:hover .group-hover\:text-white,
        .light-theme .group:hover .group-hover\:text-slate-100,
        .light-theme button:hover .group-hover\:text-slate-100,
        .light-theme .group:hover .group-hover\:text-slate-200,
        .light-theme button:hover .group-hover\:text-slate-200,
        .light-theme .group:hover .group-hover\:text-slate-300,
        .light-theme button:hover .group-hover\:text-slate-300 {
          color: #1e293b !important;
        }
        .light-theme .group:hover .group-hover\:text-slate-400,
        .light-theme button:hover .group-hover\:text-slate-400 {
          color: #475569 !important;
        }
        
        /* Ensure Inputs, Textareas & Chat Boxes look amazing and are fully readable */
        .light-theme textarea,
        .light-theme select,
        .light-theme input[type="text"],
        .light-theme input[type="password"] {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        .light-theme textarea::placeholder,
        .light-theme input::placeholder {
          color: #94a3b8 !important;
        }
        .light-theme textarea:focus,
        .light-theme select:focus,
        .light-theme input:focus {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.1) !important;
        }
        .light-theme .chat-input-focus {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }
        .light-theme .chat-input-focus:focus-within {
          border-color: #06b6d4 !important;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15) !important;
        }
        
        /* Keep pre tags, code blocks, terminal screen and canvas high-contrast dark */
        .light-theme pre,
        .light-theme .font-mono,
        .light-theme .terminal-screen,
        .light-theme .bg-slate-950 pre,
        .light-theme .whiteboard-canvas-container {
          background-color: #020617 !important;
          color: #e2e8f0 !important;
        }
        .light-theme pre *,
        .light-theme .font-mono * {
          color: inherit !important;
        }
        .light-theme pre .text-cyan-300, .light-theme pre .text-cyan-400 {
          color: #67e8f9 !important;
        }
        .light-theme pre .text-emerald-400 {
          color: #34d399 !important;
        }
        
        /* Border Overrides */
        .light-theme [class*="border-slate-"] {
          border-color: #e2e8f0 !important;
        }
        /* Keep dark borders for terminal components */
        .light-theme pre [class*="border-slate-"],
        .light-theme .font-mono [class*="border-slate-"],
        .light-theme .terminal-screen [class*="border-slate-"] {
          border-color: #1e293b !important;
        }
        
        /* Scrollbar in Light Theme */
        .light-theme ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.02); }
        .light-theme ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); }
        .light-theme ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
        
        /* Target buttons & chips specifically to be visible and clear in light theme */
        .light-theme button {
          border-color: #cbd5e1;
        }
        .light-theme button.bg-slate-950:hover,
        .light-theme button.bg-slate-900:hover {
          background-color: #e2e8f0 !important;
        }

        /* Direct overrides for dark selectors in light theme */
        .light-theme .bg-slate-900\/60.rounded-xl.border {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
        }
        
        /* High contrast colors for text classes */
        .light-theme .text-cyan-200 { color: #0891b2 !important; }
        .light-theme .text-cyan-300 { color: #0e7490 !important; }
        .light-theme .text-cyan-400 { color: #0891b2 !important; }
        .light-theme .text-blue-200 { color: #2563eb !important; }
        .light-theme .text-blue-300 { color: #1d4ed8 !important; }
        .light-theme .text-blue-400 { color: #2563eb !important; }
        .light-theme .text-indigo-200 { color: #4f46e5 !important; }
        .light-theme .text-indigo-300 { color: #4338ca !important; }
        .light-theme .text-indigo-400 { color: #4f46e5 !important; }
        .light-theme .text-emerald-200 { color: #16a34a !important; }
        .light-theme .text-emerald-300 { color: #15803d !important; }
        .light-theme .text-emerald-400 { color: #16a34a !important; }
        .light-theme .text-purple-400 { color: #7c3aed !important; }
        .light-theme .text-amber-200 { color: #d97706 !important; }
        .light-theme .text-amber-300 { color: #b55c00 !important; }
        .light-theme .text-amber-400 { color: #d97706 !important; }
        .light-theme .text-rose-200 { color: #dc2626 !important; }
        .light-theme .text-rose-300 { color: #b91c1c !important; }
        .light-theme .text-rose-400 { color: #e11d48 !important; }

        .light-theme .bg-cyan-500\/10,
        .light-theme .bg-cyan-950\/25,
        .light-theme .bg-cyan-950\/50,
        .light-theme .bg-cyan-500\/5 {
          background-color: #ecfeff !important;
          border-color: #a5f3fc !important;
          color: #0891b2 !important;
        }
        .light-theme .bg-emerald-500\/10,
        .light-theme .bg-emerald-950\/25,
        .light-theme .bg-emerald-500\/5 {
          background-color: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
          color: #16a34a !important;
        }
        .light-theme .bg-blue-500\/10,
        .light-theme .bg-blue-500\/5 {
          background-color: #eff6ff !important;
          border-color: #bfdbfe !important;
          color: #2563eb !important;
        }
        .light-theme .bg-purple-500\/10,
        .light-theme .bg-purple-500\/5 {
          background-color: #faf5ff !important;
          border-color: #e9d5ff !important;
          color: #7c3aed !important;
        }
        .light-theme button.border-cyan-400 {
          border-color: #0891b2 !important;
          color: #0891b2 !important;
          background-color: #f8fafc !important;
        }
        .light-theme .ml-8 {
          background-color: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #1e293b !important;
        }
        .light-theme .mr-8 {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #1e293b !important;
        }
        .light-theme .mr-8.border-cyan-400\/40 {
          background-color: #ecfeff !important;
          border-color: #a5f3fc !important;
        }
        
        /* Selection and Border Highlight overrides */
        .light-theme .border-cyan-500\/40 {
          border-color: #0891b2 !important;
        }
        .light-theme .border-emerald-500\/30 {
          border-color: #16a34a !important;
        }
        .light-theme button.border-cyan-500\/40,
        .light-theme .bg-slate-900\/60.border-cyan-500\/40 {
          background-color: #ecfeff !important;
          border-color: #0891b2 !important;
        }
        .light-theme button.border-emerald-500\/30 {
          background-color: #f0fdf4 !important;
          border-color: #16a34a !important;
          color: #16a34a !important;
        }
        .light-theme .theme-toggle-btn {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #475569 !important;
        }
        .light-theme .theme-toggle-btn:hover {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }
        
        /* Network Mesh View Grid and lines */
        .light-theme [class*="bg-\[radial-gradient"] {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px) !important;
        }
        .light-theme svg path[stroke="#1e293b"] {
          stroke: #e2e8f0 !important;
        }
        .light-theme svg path[stroke="#475569"] {
          stroke: #94a3b8 !important;
        }
        .light-theme .bg-slate-950\/90 {
          background-color: rgba(255, 255, 255, 0.9) !important;
        }
        .light-theme .bg-slate-900\/95 {
          background-color: rgba(255, 255, 255, 0.95) !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }

        /* Glowing Ambient Overrides for Light Mode (cleaner, more subtle) */
        .light-theme .blur-\[150px\],
        .light-theme .blur-\[180px\] {
          opacity: 0.2;
        }
      `}} />

      {/* Top Banner / Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/20">
              <Sparkle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                InfraOracle
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Enterprise Google Cloud Architect Whisperer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setState(prev => ({ ...prev, mode: 'design', error: null }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  state.mode === 'design'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Design & Review
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, mode: 'review_existing', error: null }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  state.mode === 'review_existing'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Review Existing
              </button>
            </div>

            <button
              onClick={loadQuickDemo}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 px-3.5 py-1.5 rounded-xl border border-cyan-500/30 transition-all shadow-[0_0_12px_rgba(6,182,212,0.05)] active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Demo
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="theme-toggle-btn flex items-center justify-center p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all active:scale-95"
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Continuous Conversation Chat & Inputs */}
        <div className="lg:col-span-5 flex flex-col gap-5 h-[calc(100vh-7.5rem)] min-h-[580px]">
          
          {/* Chat Feed Scrollable Log */}
          <div className="flex-grow glass-card border border-slate-800/80 rounded-2xl p-4 overflow-y-auto flex flex-col gap-4 shadow-xl">
            <div className="text-[10px] font-bold text-slate-500 border-b border-slate-800/60 pb-2 flex items-center justify-between tracking-wider uppercase">
              <span>Discussion History Feed</span>
              <span>{state.chatHistory.length} turns</span>
            </div>

            {state.chatHistory.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-8">
                <Bot className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-400 mb-1">Begin Continuous Chat</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
                  Describe what you need or submit a diagram sketch. Ask follow-up modifications in the chat!
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[240px]">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => setState(prev => ({ ...prev, prompt: sample.prompt }))}
                      className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 p-2.5 rounded-xl border border-slate-800/80 transition-colors text-left truncate"
                    >
                      💡 {sample.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pr-1">
                {state.chatHistory.map((turn) => {
                  const isUser = turn.role === 'user';
                  const isSelected = selectedTurnId === turn.id;

                  return (
                    <div 
                      key={turn.id} 
                      onClick={() => handleSelectTurn(turn)}
                      className={`flex flex-col gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                        isUser 
                          ? 'bg-slate-900/40 border-slate-800/60 ml-8' 
                          : isSelected
                            ? 'bg-cyan-500/5 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.08)] mr-8'
                            : 'bg-slate-900/60 border-slate-800 mr-8 hover:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-bold tracking-wide uppercase">
                          {isUser ? <User className="w-3 h-3 text-cyan-400" /> : <Bot className="w-3 h-3 text-emerald-400" />}
                          {isUser ? 'User Request' : 'InfraOracle'}
                        </span>
                        <span>{turn.timestamp}</span>
                      </div>

                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                      
                      {turn.image && (
                        <div className="mt-1">
                          <img 
                            src={`data:${turn.image.mime_type};base64,${turn.image.data}`} 
                            alt="Uploaded Canvas/Sketch" 
                            className="h-16 object-contain rounded border border-slate-800"
                          />
                        </div>
                      )}

                      {turn.constraints && turn.constraints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {turn.constraints.map(c => (
                            <span key={c} className="text-[8px] font-bold uppercase bg-slate-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-950">
                              🛡️ {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {turn.designResult && (
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/50 pt-2.5 text-[10px]">
                          <span className="font-extrabold text-white truncate flex items-center gap-1">
                            <Sparkle className="w-3 h-3 text-cyan-400" />
                            {turn.designResult[activeStage]?.title || turn.designResult.mvp?.title || 'Generated Cloud Setup'}
                          </span>
                          <span className={`font-bold px-2.5 py-1 rounded-lg text-[9px] border transition-all ${
                            isSelected 
                              ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                          }`}>
                            {isSelected ? 'Active View' : 'Inspect Reports'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Collapsible Whiteboard Box Drawer */}
          {showWhiteboard && (
            <div className="animate-fadeIn">
              <WhiteboardCanvas 
                onSave={handleWhiteboardSave} 
                onClose={() => setShowWhiteboard(false)} 
              />
            </div>
          )}


          {/* Input Panel Board (Prompt Textarea, Upload & Draw buttons) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl">
            <div className="flex bg-slate-900/60 rounded-xl border border-slate-800/80 p-2 items-center chat-input-focus">
              <textarea
                rows={state.mode === 'design' ? 2 : 3}
                className="flex-grow bg-transparent border-none text-slate-100 placeholder-slate-400 text-xs focus:ring-0 resize-none outline-none p-1.5"
                placeholder={
                  state.mode === 'design'
                    ? "Modify design: e.g., 'Make backend scale to zero and add Cloud Armor protection'..."
                    : "Describe system architecture, paste Mermaid diagrams, or paste Terraform snippets..."
                }
                value={state.mode === 'design' ? state.prompt : state.existingArchitecture}
                onChange={state.mode === 'design' ? handlePromptChange : handleExistingChange}
                disabled={state.loading}
              />
              <button
                onClick={handleAnalyze}
                disabled={state.loading || (state.mode === 'design' ? !state.prompt.trim() && !state.image : !state.existingArchitecture.trim() && !state.image)}
                className="w-10 h-10 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-45 text-slate-950 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-md shadow-cyan-950/30"
              >
                {state.loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-slate-950 stroke-[2.5px]" />
                )}
              </button>
            </div>

            {/* Canvas/Drawing, Image Attachment, Agent Mode & Settings Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-0.5 animate-fadeIn">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className="flex items-center gap-1.5 font-bold text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Draw Diagram Sketch
                </button>

                <div className="relative">
                  <label
                    htmlFor="image-file-upload"
                    className="flex items-center gap-1.5 font-bold text-[10px] text-slate-300 hover:text-slate-100 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Attach Image
                  </label>
                  <input 
                    id="image-file-upload" 
                    type="file" 
                    accept="image/*"
                    className="sr-only" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    disabled={state.loading}
                  />
                </div>

                {/* Enhanced Agent Mode Toggle Button */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                  antigravityMode 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                    : 'bg-slate-900 border-slate-800/80 text-slate-400'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${antigravityMode ? 'text-cyan-400' : 'text-slate-400'}`}>Agent Mode</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={antigravityMode}
                      onChange={() => setAntigravityMode(!antigravityMode)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:bg-cyan-400 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-slate-950"></div>
                  </label>
                </div>
              </div>

              {/* Active Settings Badges (Promote visibility so user is aware what's in the Settings Drawer!) */}
              <div className="flex flex-wrap items-center gap-2.5">
                {antigravityMode && (
                  <button
                    type="button"
                    onClick={() => { setShowSettings(true); setPersonaExpanded(true); }}
                    className="flex items-center gap-1.5 text-[9px] font-bold bg-cyan-950/25 hover:bg-cyan-950/50 border border-cyan-800/30 text-cyan-300 hover:text-cyan-200 px-2.5 py-1.5 rounded-xl transition-all"
                    title="Active Agent Persona. Click to change."
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="opacity-80">Persona:</span>
                    <span className="text-white ml-0.5">
                      {state.auditStrategy === 'default' && 'Core'}
                      {state.auditStrategy === 'chaos_monkey' && 'Chaos'}
                      {state.auditStrategy === 'finops' && 'FinOps'}
                      {state.auditStrategy === 'zero_trust' && 'Security'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setShowSettings(true); setConstraintsExpanded(true); }}
                  className={`flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1.5 rounded-xl transition-all border ${
                    selectedConstraints.length > 0 
                      ? 'bg-emerald-950/25 border-emerald-800/30 text-emerald-300 hover:text-emerald-200'
                      : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-300'
                  }`}
                  title="Enforced design constraints. Click to change."
                >
                  <Sliders className={`w-3.5 h-3.5 ${selectedConstraints.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="opacity-80">Constraints:</span>
                  <span className={`ml-0.5 ${selectedConstraints.length > 0 ? 'text-white' : 'font-normal'}`}>
                    {selectedConstraints.length === 0 
                      ? 'None' 
                      : `${selectedConstraints.length} Active`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-1.5 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all border ${
                    showSettings 
                      ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100 hover:scale-[1.02]'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Configure Settings
                </button>
              </div>
            </div>

            {/* Render file attachments if present */}
            {state.image && (
              <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-300 animate-fadeIn">
                <div className="flex items-center gap-2 truncate">
                  <img 
                    src={URL.createObjectURL(state.image)} 
                    alt="Preview File" 
                    className="h-8 object-contain rounded"
                  />
                  <span className="truncate max-w-[150px]">{state.image.name}</span>
                </div>
                <button 
                  onClick={removeImage}
                  className="text-rose-400 hover:text-rose-300 font-bold ml-2 text-[10px]"
                >
                  Remove Attachment
                </button>
              </div>
            )}
          </div>
          {state.mode === 'review_existing' && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Live GCP Environment Scan
                    </h4>
                    <p className="text-[9px] text-slate-500 leading-none">Inspect real-time serverless and DB postures</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Glowing Connection Status Badge */}
                  {isGcpConnecting ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                      HANDSHAKING...
                    </div>
                  ) : gcpProjects.length > 0 ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                      CONNECTED
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      OFFLINE
                    </div>
                  )}

                  <button
                    onClick={() => setShowGcpScanner(!showGcpScanner)}
                    className="text-[9px] font-extrabold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-md transition-all uppercase tracking-wide"
                  >
                    {showGcpScanner ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {showGcpScanner ? (
                <div className="space-y-4 animate-fadeIn max-h-[250px] overflow-y-auto pr-1">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Scan Cloud Run, Cloud SQL, VM Instances, and GCS Buckets in real-time. Securely authenticate client-side with zero credentials stored on our servers.
                  </p>

                  {gcpProjects.length === 0 ? (
                    <div className="space-y-4">
                      {/* Connection Methods Header / Toggle Tabs */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-900/30 p-1 rounded-xl border border-slate-855">
                        <button
                          type="button"
                          className="py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-center rounded-lg bg-slate-900 border border-slate-800 text-cyan-300"
                        >
                          OAuth Handshake
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGcpToken('mock');
                            handleGcpConnect(true);
                          }}
                          className="py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-center rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 text-cyan-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Instantly test scanning using simulated production environments"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400 animate-bounce" />
                          Launch Demo
                        </button>
                      </div>

                      {/* OAuth Access Token Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                          <Key className="w-3 h-3 text-cyan-400" />
                          GCP OAuth / Access Token
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <input
                            type="password"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="Paste GCP Access Token or type 'mock'"
                            value={gcpToken}
                            onChange={(e) => setGcpToken(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Guide Block with Copy-to-Clipboard Widget */}
                      <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                        <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                          Shell Generation Guide
                        </span>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Generate an ephemeral 1-hour access token from your local CLI setup:
                        </p>
                        <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[10px] font-mono text-cyan-300 gap-2">
                          <span className="truncate">gcloud auth print-access-token</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('gcloud auth print-access-token');
                              setCommandCopied(true);
                              setTimeout(() => setCommandCopied(false), 2000);
                            }}
                            className={`p-1.5 rounded-md border transition-all ${
                              commandCopied 
                                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' 
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                            title="Copy command to clipboard"
                          >
                            {commandCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Connect Button */}
                      <button
                        onClick={() => handleGcpConnect(false)}
                        disabled={isGcpConnecting || !gcpToken.trim()}
                        className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 hover:border-cyan-400/60 text-cyan-300 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.05)] disabled:opacity-45"
                      >
                        {isGcpConnecting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            Connecting Cloud Handshake...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-cyan-400" />
                            Establish Connection
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Project Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                          Target GCP Project
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Server className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                          <select
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                          >
                            {gcpProjects.map((p) => (
                              <option key={p.projectId} value={p.projectId}>
                                {p.name} ({p.projectId})
                              </option>
                            ))}
                          </select>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          </span>
                        </div>
                      </div>

                      {/* Resource Selector 2x2 Grid */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                          Resources to Scan & Audit
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { id: 'run', label: 'Cloud Run', icon: Layers, desc: 'Services & Ingress' },
                            { id: 'sql', label: 'Cloud SQL', icon: Database, desc: 'Instances & Backups' },
                            { id: 'gce', label: 'Compute Engine', icon: Cpu, desc: 'VM Gaps & SPOFs' },
                            { id: 'gcs', label: 'Cloud Storage', icon: Cloud, desc: 'Buckets & Access' }
                          ].map((t) => {
                            const isChecked = (scanTypes as any)[t.id];
                            const IconComp = t.icon;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setScanTypes(prev => ({ ...prev, [t.id]: !isChecked }))}
                                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                  isChecked
                                    ? 'bg-cyan-500/5 border-cyan-500/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500 hover:border-slate-700/80 hover:text-slate-300'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg border ${
                                  isChecked
                                    ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-400'
                                    : 'bg-slate-950 border-slate-850 text-slate-600'
                                }`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-extrabold tracking-wide uppercase leading-none">{t.label}</div>
                                  <div className="text-[9px] opacity-60 leading-none">{t.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Connected Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setGcpToken('');
                            setGcpProjects([]);
                            setSelectedProject('');
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs py-2.5 rounded-xl font-bold transition-all"
                        >
                          Disconnect
                        </button>
                        <button
                          onClick={() => handleGcpScan(gcpToken === 'mock')}
                          disabled={isGcpScanning || !Object.values(scanTypes).some(Boolean)}
                          className="flex-[2] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs py-2.5 rounded-xl font-extrabold shadow-md shadow-cyan-500/10 flex items-center justify-center gap-1.5 transition-all disabled:opacity-45"
                        >
                          {isGcpScanning ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              Scanning API endpoints...
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Start Project Scan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scan console logs with custom DevOps styled terminal */}
                  {gcpLogs.length > 0 && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" />
                          Scanner Pipeline Terminal Output
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/20 border border-emerald-900/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE STREAM
                        </div>
                      </div>
                      <div className="bg-slate-950 text-emerald-400 font-mono text-[9px] p-3 rounded-xl border border-slate-800 h-28 overflow-y-auto space-y-1.5 shadow-inner select-text">
                        {gcpLogs.map((log, idx) => {
                          const isSuccess = log.includes('[✓]') || log.includes('Success');
                          const isError = log.includes('[✗]') || log.includes('Error') || log.includes('Failed');
                          const isInfo = log.includes('[!]') || log.includes('Warning') || log.includes('Initializing');
                          let colorClass = "text-emerald-400/90";
                          if (isSuccess) colorClass = "text-emerald-300 font-bold";
                          else if (isError) colorClass = "text-rose-400 font-semibold";
                          else if (isInfo) colorClass = "text-cyan-400/80";

                          return (
                            <div key={idx} className={`animate-in fade-in duration-100 flex items-start gap-1 ${colorClass}`}>
                              <span className="text-slate-600 select-none mr-0.5">&gt;</span>
                              <span>{log}</span>
                            </div>
                          );
                        })}
                        <div className="text-emerald-400 animate-pulse font-bold select-none">&gt; _</div>
                      </div>
                    </div>
                  )}

                  {gcpError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl text-[10px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span>{gcpError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {gcpProjects.length > 0 ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                        Connected (Project: {selectedProject})
                      </span>
                    ) : (
                      'GCP Live Integration: Disconnected'
                    )}
                  </span>
                  <button
                    onClick={() => setShowGcpScanner(true)}
                    className="text-cyan-400 font-bold hover:underline"
                  >
                    {gcpProjects.length > 0 ? 'Modify scan settings' : 'Get started'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Setting Accordions (Relocated at the very bottom) */}
          {showSettings && !showWhiteboard && (
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl mt-4 animate-fadeIn border-t border-slate-800/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-850/60">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Advanced Audit Settings</h4>
                    <p className="text-[9px] text-slate-500 leading-none mt-0.5">Customize AI scanner behavior & compliance criteria</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-md transition-all"
                >
                  Close Settings
                </button>
              </div>

              {/* Accordion 1: Audit Persona Auditor */}
              <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setPersonaExpanded(!personaExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/30 hover:bg-slate-900/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-[10px] font-extrabold text-white uppercase tracking-wide">1. Agent Persona Auditor</span>
                      <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                        Active: <span className="text-cyan-300 font-bold">
                          {state.auditStrategy === 'default' && 'Core Principal Architect'}
                          {state.auditStrategy === 'chaos_monkey' && 'Chaos Monkey Engine'}
                          {state.auditStrategy === 'finops' && 'FinOps CostGuard'}
                          {state.auditStrategy === 'zero_trust' && 'Zero-Trust Hardener'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {personaExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {personaExpanded && (
                  <div className="p-3 bg-slate-950/60 border-t border-slate-900 space-y-2 animate-fadeIn">
                    {[
                      {
                        id: 'default',
                        label: 'Core Principal Architect Stance',
                        icon: Bot,
                        color: 'text-cyan-400',
                        bg: 'bg-cyan-500/5',
                        borderColor: 'border-cyan-500/10 hover:border-cyan-500/30',
                        desc: 'Uses balanced corporate cloud design parameters. Focuses on regional reliability, standard security perimeters, and modular cost tiers.'
                      },
                      {
                        id: 'chaos_monkey',
                        label: 'The Chaos Monkey Auditing Engine',
                        icon: Activity,
                        color: 'text-rose-400',
                        bg: 'bg-rose-500/5',
                        borderColor: 'border-rose-500/10 hover:border-rose-500/30',
                        desc: 'Disaster resilience auditing parameters. Actively searching for Single-Points-of-Failure (SPOFs), cross-zone failover risks, and disaster recovery gaps.'
                      },
                      {
                        id: 'finops',
                        label: 'The FinOps Auditor CostGuard Stance',
                        icon: DollarSign,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/5',
                        borderColor: 'border-emerald-500/10 hover:border-emerald-500/30',
                        desc: 'Strict high-density resource optimization, highlighting over-provisioned VMs, missing lifecycle rules, and scale-to-zero serverless opportunities.'
                      },
                      {
                        id: 'zero_trust',
                        label: 'The Zero-Trust Hardener Secure Stance',
                        icon: ShieldCheck,
                        color: 'text-indigo-400',
                        bg: 'bg-indigo-500/5',
                        borderColor: 'border-indigo-500/10 hover:border-indigo-500/30',
                        desc: 'Enforces maximum security containment, checking for public IP exposure, un-rotated Cloud KMS keys, public network ingress, and loose IAM privilege boundaries.'
                      }
                    ].map((item) => {
                      const isSelected = state.auditStrategy === item.id;
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, auditStrategy: item.id as any }))}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-slate-900 border-slate-700/60 shadow-[0_0_12px_rgba(255,255,255,0.03)]'
                              : 'bg-transparent border-transparent hover:bg-slate-900/30'
                          }`}
                        >
                          <div className={`p-2 rounded-lg bg-slate-950 border border-slate-900 flex-shrink-0 ${item.color}`}>
                            <IconComp className={`w-4 h-4 ${isSelected ? 'animate-pulse' : ''}`} />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-extrabold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{item.label}</span>
                              {isSelected && (
                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-950/80 border ${item.color} border-current`}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Accordion 2: Architecture Design Constraints */}
              <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setConstraintsExpanded(!constraintsExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/30 hover:bg-slate-900/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-extrabold text-white uppercase tracking-wide">2. Design Constraints</span>
                      <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                        Selected: <span className="text-emerald-300 font-bold">
                          {selectedConstraints.length === 0 ? 'None (Full freedom)' : `${selectedConstraints.length} active criteria`}
                        </span>
                      </p>
                    </div>
                  </div>
                  {constraintsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {constraintsExpanded && (
                  <div className="p-3 bg-slate-950/60 border-t border-slate-900 space-y-3 animate-fadeIn">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Enforce strict system audit gates. When analyzing schemas or drawing sketches, the compiler automatically filters recommendations using these target boundaries.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CONSTRAINT_CHIPS.map((chip) => {
                        const isChecked = selectedConstraints.includes(chip.id);
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => handleToggleConstraint(chip.id)}
                            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                              isChecked
                                ? 'bg-emerald-500/5 border-emerald-500/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                              {isChecked ? '✓' : '○'} {chip.label}
                            </span>
                            <span className="text-[8px] opacity-60 leading-tight mt-1">{chip.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Topology Diagram, Audits, Terraform outputs */}
        <div className="lg:col-span-7 flex flex-col">
          {state.loading ? (
            <div className="h-full min-h-[400px] flex-grow flex flex-col items-center justify-center glass-card border border-slate-800 rounded-2xl shadow-xl p-8 text-center animate-fadeIn">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_#22d3ee]" />
              <h3 className="text-base font-black text-white mb-2">Analyzing Architecture</h3>
              <p className="text-slate-400 text-xs mb-6">{state.loadingStep}</p>

              {/* Antigravity Sandbox Terminal Logger */}
              {antigravityMode && agentLogs.length > 0 && (
                <div className="w-full max-w-xl bg-slate-950 text-left rounded-xl p-4.5 font-mono text-[11px] text-emerald-400 border border-slate-800 shadow-inner h-52 overflow-y-auto space-y-1">
                  <div className="text-slate-500 border-b border-slate-800 pb-1.5 mb-2.5 flex items-center justify-between font-bold">
                    <span>Antigravity Sandbox Terminal Console</span>
                    <span className="animate-pulse text-emerald-400">● REMOTE ACTIVE</span>
                  </div>
                  {agentLogs.map((log, idx) => (
                    <div key={idx} className="animate-in fade-in duration-200">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : state.reviewResult ? (
            <div className="glass-card border border-slate-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden animate-fadeIn">
              
              {/* Header Details */}
              <div className="p-6 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                    {state.designResult ? 'Cloud Architecture Design' : 'Infrastructure Audit Report'}
                  </span>
                  <button
                    onClick={exportReportAsMarkdown}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Markdown
                  </button>
                </div>
                <h2 className="text-xl font-extrabold text-white mb-1.5">
                  {state.designResult ? state.designResult[activeStage].title : 'External Environment Architecture Audit'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {state.designResult ? state.designResult[activeStage].summary : 'A complete audit of system assets, security rules, cost budgets, and fault tolerance measures.'}
                </p>
              </div>

              {/* Architecture Time Machine Slider Selector */}
              {state.designResult && (
                <div className="px-6 py-4 bg-slate-950/30 border-b border-slate-800/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                      Architecture Time Machine (Evolving Stages)
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      Active: {activeStage.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="relative flex items-center justify-between w-full mt-2 px-4">
                    {/* Background Progress Line */}
                    <div className="absolute left-10 right-10 h-0.5 bg-slate-850 z-0">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500" 
                        style={{ 
                          width: activeStage === 'mvp' ? '0%' : activeStage === 'growth' ? '50%' : '100%' 
                        }}
                      />
                    </div>

                    {/* Stage 1: MVP */}
                    <button 
                      onClick={() => setActiveStage('mvp')}
                      className="relative z-10 flex flex-col items-center gap-1.5 focus:outline-none group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                        activeStage === 'mvp'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_#06b6d4]'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                      }`}>
                        <span className="text-xs font-black">01</span>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold transition-colors ${activeStage === 'mvp' ? 'text-cyan-400 font-extrabold' : 'text-slate-400 group-hover:text-slate-200'}`}>MVP</div>
                        {state.reviewResult?.mvp?.overall_score && (
                          <div className="text-[9px] font-semibold text-slate-500">Score: {state.reviewResult.mvp.overall_score}</div>
                        )}
                      </div>
                    </button>

                    {/* Stage 2: Growth */}
                    <button 
                      onClick={() => setActiveStage('growth')}
                      className="relative z-10 flex flex-col items-center gap-1.5 focus:outline-none group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                        activeStage === 'growth'
                          ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-[0_0_12px_#3b82f6]'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                      }`}>
                        <span className="text-xs font-black">02</span>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold transition-colors ${activeStage === 'growth' ? 'text-blue-400 font-extrabold' : 'text-slate-400 group-hover:text-slate-200'}`}>Growth</div>
                        {state.reviewResult?.growth?.overall_score && (
                          <div className="text-[9px] font-semibold text-slate-500">Score: {state.reviewResult.growth.overall_score}</div>
                        )}
                      </div>
                    </button>

                    {/* Stage 3: Enterprise */}
                    <button 
                      onClick={() => setActiveStage('enterprise')}
                      className="relative z-10 flex flex-col items-center gap-1.5 focus:outline-none group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                        activeStage === 'enterprise'
                          ? 'bg-indigo-500 text-slate-950 border-indigo-400 shadow-[0_0_12px_#6366f1]'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                      }`}>
                        <span className="text-xs font-black">03</span>
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-bold transition-colors ${activeStage === 'enterprise' ? 'text-indigo-400 font-extrabold' : 'text-slate-400 group-hover:text-slate-200'}`}>Enterprise</div>
                        {state.reviewResult?.enterprise?.overall_score && (
                          <div className="text-[9px] font-semibold text-slate-500">Score: {state.reviewResult.enterprise.overall_score}</div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs Menu Header */}
              <div className="flex border-b border-slate-800/60 bg-slate-950/60">
                {state.designResult && (
                  <button
                    onClick={() => setState(prev => ({ ...prev, activeTab: 'architecture' }))}
                    className={`py-4 px-6 text-xs font-bold text-center border-b-2 transition-all ${
                      state.activeTab === 'architecture'
                        ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Topology Diagram
                    </div>
                  </button>
                )}
                
                <button
                  onClick={() => setState(prev => ({ ...prev, activeTab: 'review' }))}
                  className={`py-4 px-6 text-xs font-bold text-center border-b-2 transition-all ${
                    state.activeTab === 'review'
                      ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Audit Findings
                  </div>
                </button>

                {state.designResult && (
                  <button
                    onClick={() => setState(prev => ({ ...prev, activeTab: 'terraform' }))}
                    className={`py-4 px-6 text-xs font-bold text-center border-b-2 transition-all ${
                      state.activeTab === 'terraform'
                        ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5" />
                      Terraform Manifest
                    </div>
                  </button>
                )}
              </div>

              {/* Tab Display Panel */}
              <div className="p-6 overflow-y-auto flex-grow h-[calc(100vh-23.5rem)] min-h-[380px]">
                {state.activeTab === 'architecture' && renderArchitectureTab()}
                {state.activeTab === 'review' && renderReviewTab()}
                {state.activeTab === 'terraform' && renderTerraformTab()}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex-grow flex flex-col items-center justify-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center animate-fadeIn relative">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center mb-4">
                <LayoutTemplate className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-base font-black text-slate-200 mb-1.5">No Active Auditing Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                {state.mode === 'design' 
                  ? 'Submit your request or draw a whiteboard sketch on the left, and Google Cloud design specs with reviews will render here.'
                  : 'Submit description or sketch of your running infrastructure configurations, and complete optimization reports will generate here.'}
              </p>
              <button
                onClick={loadQuickDemo}
                className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 px-5 py-2.5 rounded-xl shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4 animate-bounce" />
                Instantly Load Mock Demo
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Settings Sliding Drawer Backdrop */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fadeIn"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Settings Sliding Drawer Container */}
      {showSettings && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300 transform translate-x-0">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/10">
            <div className="space-y-1">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Workspace Configuration
              </h3>
              <p className="text-xs text-slate-400">Tailor the AI runtime environment and architecture metrics.</p>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto flex-grow space-y-6">
            
            {/* SECTION 1: Antigravity Audit Persona (Strategy) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Agent Audit Stance (Persona)
                </h4>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded border border-cyan-500/20">
                  {state.auditStrategy === 'default' ? 'Core Balanced' : state.auditStrategy.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a specialized persona for the Antigravity Managed Agent. This adapts audit vectors, security hardening rules, and budget metrics.
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: 'default', label: 'Core Principal Architect', desc: 'Balanced corporate stance prioritizing standard security, multi-zone HA, and modular cost tiers.', icon: Bot, color: 'text-cyan-400', border: 'hover:border-cyan-500/30' },
                  { id: 'chaos_monkey', label: 'The Chaos Monkey', desc: 'Focuses on single-point-of-failure (SPOF) analysis, zonal/regional disaster recovery, and failover validation.', icon: Activity, color: 'text-rose-400', border: 'hover:border-rose-500/30' },
                  { id: 'finops', label: 'The FinOps Auditor', desc: 'Strict financial optimization, highlighting over-provisioned VMs, missing lifecycle rules, and scale-to-zero serverless options.', icon: DollarSign, color: 'text-emerald-400', border: 'hover:border-emerald-500/30' },
                  { id: 'zero_trust', label: 'The Zero-Trust Hardener', desc: 'Enforces maximum least-privilege containment, scanning public IP boundaries, KMS CMEK encryption, and IAM scopes.', icon: ShieldCheck, color: 'text-indigo-400', border: 'hover:border-indigo-500/30' }
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = state.auditStrategy === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setState(prev => ({ ...prev, auditStrategy: item.id as any }))}
                      className={`w-full p-4 rounded-xl border text-left flex gap-3.5 transition-all relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-slate-900/60 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.04)]' 
                          : `bg-slate-950 border-slate-800/80 ${item.border}`
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-cyan-500/20 to-transparent flex items-start justify-end p-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </div>
                      )}
                      <div className={`p-2.5 rounded-lg bg-slate-950 border ${isSelected ? 'border-cyan-500/20' : 'border-slate-800'} flex-shrink-0 ${item.color}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white transition-colors'}`}>
                          {item.label}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Target Architecture Constraints */}
            <div className="space-y-3 pt-2 border-t border-slate-900">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Target Design Constraints
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Force-inject specific requirements into the AI design engine. You can toggle multiple constraints.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {CONSTRAINT_CHIPS.map((chip) => {
                  const isSelected = selectedConstraints.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => handleToggleConstraint(chip.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all group ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                      title={chip.desc}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-extrabold ${isSelected ? 'text-emerald-300' : 'text-slate-300 group-hover:text-white'}`}>
                          {chip.label}
                        </span>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34a853]" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 leading-tight group-hover:text-slate-400 transition-colors line-clamp-2">
                        {chip.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: Saved Run History (Architecture Time Machine Archive) */}
            <div className="space-y-3 pt-2 border-t border-slate-900">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" />
                Archived Scans & Designs
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Access your locally cached historical runs. Clicking any run instantly restores the exact specifications, review metrics, and discussion state.
              </p>

              {state.savedRuns.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block">No saved run history. Runs are auto-archived once generated.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {state.savedRuns.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => loadRun(run)}
                      className="p-3 bg-slate-950 hover:bg-slate-900/60 border border-slate-900 hover:border-slate-800 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                          {run.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          <span className="font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">
                            {run.mode === 'design' ? 'DESIGN' : 'AUDIT'}
                          </span>
                          <span>{run.timestamp}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteRun(run.id, e)}
                        className="p-1.5 rounded bg-slate-900 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 transition-all flex-shrink-0"
                        title="Delete historical run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/20 text-center">
            <span className="text-[10px] text-slate-500 leading-normal block">
              💡 Configure constraints and stances to refine model prompt instructions before executing audits.
            </span>
          </div>
        </div>
      )}

      {/* Floating Clipboard success Toast */}
      {(copied || commandCopied) && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-cyan-500/30 text-white rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3.5 backdrop-blur-md animate-fadeIn max-w-sm">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex-shrink-0">
            <Check className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Action Successful</h5>
            <p className="text-[11px] text-slate-400 leading-normal">
              {copied 
                ? 'Terraform Code snippet copied to clipboard.' 
                : 'GCP login helper command copied to clipboard.'}
            </p>
          </div>
        </div>
      )}
      {/* Hackathon Footer Bar */}
      <footer className="border-t border-slate-900/60 bg-slate-950/80 py-3.5 text-center z-10">
        <div className="max-w-7xl mx-auto px-4 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
          <span>Powered by</span>
          <span className="font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shadow-sm">
            Gemini 3.5 Flash
          </span>
          <span>&</span>
          <span className="font-extrabold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 shadow-sm">
            Antigravity Managed Agent Runtime
          </span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="font-semibold text-slate-400">Deployed on</span>
          <span className="font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 shadow-sm">
            <Cloud className="w-3 h-3 text-blue-400" />
            Cloud Run
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
