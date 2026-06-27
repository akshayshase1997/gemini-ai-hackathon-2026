import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, Minimize2, RefreshCw, X, Shield, Cpu, Cloud, Database, 
  Terminal, BarChart2, MessageSquare, AlertCircle, Info, DollarSign,
  ZoomIn, ZoomOut
} from 'lucide-react';

interface GcpNetworkTopologyProps {
  chart: string;
  isExpanded?: boolean;
}

interface Node {
  id: string;
  label: string;
  type: string;
  level: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Position {
  x: number;
  y: number;
}

// 1. High-Tech Stylized Inline GCP Icons
const GcpIcons: Record<string, () => React.JSX.Element> = {
  user: () => (
    <svg className="w-9 h-9 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  networking: () => (
    <svg className="w-9 h-9 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m14-6l4 6-4 6M7 6L3 12l4 6" />
      <circle cx="12" cy="12" r="3" className="fill-cyan-950 stroke-cyan-400" />
    </svg>
  ),
  cloudrun: () => (
    <svg className="w-9 h-9 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      <path strokeLinecap="round" d="M7 10h10M7 13h10" strokeWidth="2" stroke="currentColor" />
    </svg>
  ),
  gke: () => (
    <svg className="w-9 h-9 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M12 3v6M12 15v6M3 12h6M15 12h3M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2" />
    </svg>
  ),
  gce: () => (
    <svg className="w-9 h-9 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" className="fill-emerald-950 stroke-emerald-400" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  ),
  functions: () => (
    <svg className="w-9 h-9 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  appengine: () => (
    <svg className="w-9 h-9 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-10.44-5.21M12 3v3M12 18v3M3 12h3M18 12h3" />
      <polygon points="12,7 16,14 8,14" className="fill-blue-950 stroke-blue-400" />
    </svg>
  ),
  storage: () => (
    <svg className="w-9 h-9 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      <path d="M9 6v6M15 6v6" strokeDasharray="2,2" />
    </svg>
  ),
  database: () => (
    <svg className="w-9 h-9 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" className="fill-blue-950 stroke-blue-500" />
      <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
      <path d="M12 8v12" strokeDasharray="3,3" />
    </svg>
  ),
  bigquery: () => (
    <svg className="w-9 h-9 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.1125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      <circle cx="15" cy="15" r="4" className="stroke-fuchsia-400 fill-purple-950" />
      <line x1="18" y1="18" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  pubsub: () => (
    <svg className="w-9 h-9 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" className="fill-orange-950 stroke-orange-400" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="20" r="2" />
      <path d="M7 12h2M17 12h2M12 7v2M12 17v2" />
      <path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" strokeDasharray="1,1" />
    </svg>
  ),
  analytics: () => (
    <svg className="w-9 h-9 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.1125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  ai: () => (
    <svg className="w-9 h-9 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" className="stroke-pink-500 fill-pink-950" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <path d="M12 6v2M12 16v2M6 12h2M16 12h2" />
      <path d="M12 12l5-5M12 12l-5 5M12 12l5 5M12 12l-5-5" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  ),
  build: () => (
    <svg className="w-9 h-9 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  logging: () => (
    <svg className="w-9 h-9 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75c.621 0 1.125.504 1.125 1.125v3c0 .621-.504 1.125-1.125 1.125H5.625a1.125 1.125 0 01-1.125-1.125v-3c0-.621.504-1.125 1.125-1.125z" />
    </svg>
  ),
  security: () => (
    <svg className="w-9 h-9 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.959 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  default: () => (
    <svg className="w-9 h-9 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 00.364-7.463 8.25 8.25 0 00-14.156-4.637A4.5 4.5 0 002.25 15z" />
    </svg>
  )
};

// Node classification & layout categorizer
const detectGcpType = (label: string): string => {
  const l = label.toLowerCase();
  if (l.includes('user') || l.includes('client') || l.includes('browser') || l.includes('customer') || l.includes('developer')) return 'user';
  if (l.includes('load balancing') || l.includes('loadbalancer') || l.includes('load balancer') || l.includes('lb') || l.includes('cdn') || l.includes('dns') || l.includes('armor')) return 'networking';
  if (l.includes('cloud run') || l.includes('run')) return 'cloudrun';
  if (l.includes('gke') || l.includes('kubernetes') || l.includes('k8s')) return 'gke';
  if (l.includes('compute') || l.includes('vm') || l.includes('virtual machine') || l.includes('instance')) return 'gce';
  if (l.includes('function') || l.includes('cloud function')) return 'functions';
  if (l.includes('app engine') || l.includes('gae')) return 'appengine';
  if (l.includes('gcs') || l.includes('storage') || l.includes('bucket')) return 'storage';
  if (l.includes('sql') || l.includes('postgres') || l.includes('mysql') || l.includes('spanner') || l.includes('firestore') || l.includes('datastore') || l.includes('bigtable') || l.includes('database') || l.includes('db')) return 'database';
  if (l.includes('bigquery') || l.includes('bq') || l.includes('data warehouse')) return 'bigquery';
  if (l.includes('pubsub') || l.includes('pub/sub') || l.includes('queue') || l.includes('tasks')) return 'pubsub';
  if (l.includes('dataflow') || l.includes('dataproc') || l.includes('composer') || l.includes('airflow')) return 'analytics';
  if (l.includes('vertex') || l.includes('ai') || l.includes('ml') || l.includes('gemini') || l.includes('translation') || l.includes('model')) return 'ai';
  if (l.includes('build') || l.includes('cloud build')) return 'build';
  if (l.includes('logging') || l.includes('monitoring') || l.includes('ops') || l.includes('trace') || l.includes('debugger')) return 'logging';
  if (l.includes('iam') || l.includes('kms') || l.includes('key') || l.includes('secrets') || l.includes('secret manager') || l.includes('auth')) return 'security';
  return 'default';
};

const assignLevel = (type: string): number => {
  switch (type) {
    case 'user': return 0;
    case 'networking': return 1;
    case 'cloudrun':
    case 'gke':
    case 'gce':
    case 'functions':
    case 'appengine': return 2;
    case 'pubsub': return 3;
    case 'database':
    case 'storage': return 4;
    case 'bigquery':
    case 'ai':
    case 'analytics': return 5;
    case 'security':
    case 'logging':
    case 'build': return 6;
    default: return 2;
  }
};

const getTypeName = (type: string): string => {
  switch (type) {
    case 'user': return 'Client Ingress';
    case 'networking': return 'Cloud Load Balancing';
    case 'cloudrun': return 'Cloud Run';
    case 'gke': return 'Kubernetes Engine';
    case 'gce': return 'Compute Engine';
    case 'functions': return 'Cloud Functions';
    case 'appengine': return 'App Engine';
    case 'storage': return 'Cloud Storage';
    case 'database': return 'Database Instance';
    case 'bigquery': return 'BigQuery Warehouse';
    case 'pubsub': return 'Cloud Pub/Sub';
    case 'analytics': return 'Data Pipeline';
    case 'ai': return 'Vertex AI Model';
    case 'build': return 'Cloud Build';
    case 'logging': return 'Cloud Operations';
    case 'security': return 'IAM & Security';
    default: return 'GCP Service';
  }
};

const getTypeColorClass = (type: string): string => {
  switch (type) {
    case 'user': return 'border-slate-500 hover:border-slate-300 text-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.1)]';
    case 'networking': return 'border-cyan-500/50 hover:border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]';
    case 'cloudrun':
    case 'gke':
    case 'functions':
    case 'appengine': return 'border-sky-500/50 hover:border-sky-400 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]';
    case 'gce': return 'border-emerald-500/50 hover:border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]';
    case 'storage': return 'border-amber-500/50 hover:border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]';
    case 'database': return 'border-blue-500/50 hover:border-blue-400 text-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.15)]';
    case 'bigquery': return 'border-purple-500/50 hover:border-purple-400 text-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.15)]';
    case 'pubsub': return 'border-orange-500/50 hover:border-orange-400 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]';
    case 'ai': return 'border-pink-500/50 hover:border-pink-400 text-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.15)]';
    case 'security': return 'border-rose-500/50 hover:border-rose-400 text-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.15)]';
    default: return 'border-slate-700 hover:border-slate-500 text-slate-300';
  }
};

const getServiceDetails = (type: string, label: string) => {
  switch (type) {
    case 'user': return {
      desc: 'External end-users, mobile devices, and browser interfaces initiating requests.',
      scaling: 'Vast, unpredictable scaling from global regions.',
      security: 'Enforce HTTPS (TLS), protect against DDoS with Cloud Armor, and use Identity-Aware Proxy (IAP) where necessary.',
      cost: 'Cost matches external bandwidth and CDN egress rates.'
    };
    case 'networking': return {
      desc: `Cloud Load Balancing handles globally distributed ingress, HTTP(S) routing, SSL termination, and directs users to nearby endpoints.`,
      scaling: 'Autoscales instantly to millions of requests per second without pre-warming.',
      security: 'Integrate Google Cloud Armor for WAF protections (SQL injection, XSS) and Edge DDoS defense.',
      cost: 'Base rate ~$25/month + data processing fees ($0.008 per GB).'
    };
    case 'cloudrun': return {
      desc: `Cloud Run runs serverless stateless containers. Best for web APIs and microservices.`,
      scaling: 'Autoscales rapidly from 0 to thousands of instances based on incoming concurrency.',
      security: 'Configure Secrets Manager for sensitive credentials; keep IAM roles bounded by Least Privilege.',
      cost: 'Pay-per-use: $0.00002400 / vCPU-second, $0.00000250 / GB-second. Scale-to-zero keeps development costs at $0.'
    };
    case 'gke': return {
      desc: 'Google Kubernetes Engine (GKE) coordinates managed clusters running containerized microservices.',
      scaling: 'Node auto-provisioning and horizontal pod autoscaling dynamically adjust based on resource demand.',
      security: 'Configure private clusters, enforce Network Policies, and scan container images in Artifact Registry.',
      cost: 'Management fee of $0.10/hour per cluster, plus Compute Engine VM node costs.'
    };
    case 'gce': return {
      desc: 'Compute Engine VM instances running custom OS kernels and legacy monolithic processes.',
      scaling: 'Uses Managed Instance Groups (MIGs) with autoscaling templates based on CPU utilization.',
      security: 'Disable external IPs, leverage Identity-Aware Proxy (IAP) for SSH, and block unneeded firewall ingress.',
      cost: 'Flat-rate VM pricing based on vCPU and RAM. E.g. e2-medium is ~$25/month.'
    };
    case 'storage': return {
      desc: 'Cloud Storage (GCS) provides unified object storage with high availability and geo-redundancy.',
      scaling: 'Virtually infinite scalability with automated multi-regional replication.',
      security: 'Disable public access, use Uniform Bucket-Level Access, and enforce Object Lifecycle Management.',
      cost: 'Standard Storage ~$0.020/GB/month. Nearline/Archive storage is cheaper for cold data.'
    };
    case 'database': return {
      desc: `Relational database storage (${label}) handling transactions with absolute ACID compliance.`,
      scaling: 'Vertical scaling for Cloud SQL; Cloud Spanner supports multi-region horizontal scaling.',
      security: 'Enforce SSL connections, place instance inside a private VPC with Private Service Connect (PSC), and encrypt storage.',
      cost: 'Cloud SQL starts at ~$10/month for db-f1-micro, typically ~$100+ for enterprise production.'
    };
    case 'bigquery': return {
      desc: 'BigQuery serves as a petabyte-scale, fully managed serverless enterprise data warehouse.',
      scaling: 'Serverless architecture allocates thousands of querying slots dynamically in parallel.',
      security: 'Restrict access with IAM dataset permissions and row/column-level security masks.',
      cost: 'Storage: $0.020/GB/month. Queries: $5 per TB scanned (or flat-rate capacity editions).'
    };
    case 'pubsub': return {
      desc: 'Cloud Pub/Sub coordinates high-throughput asynchronous message routing and streaming microservices.',
      scaling: 'Fully serverless pipeline scaling globally to millions of messages per second.',
      security: 'Enable IAM service account publishing permissions and restrict subscription access.',
      cost: 'Pay-per-use: $40 per TB of data processed (first 10GB/month is free).'
    };
    case 'ai': return {
      desc: `Vertex AI coordinates hosting of machine learning models and serverless Gemini endpoint invocations.`,
      scaling: 'Autoscaled endpoints scaling down to zero when idle (for specific serverless models).',
      security: 'Store API keys/tokens in Secret Manager; restrict training pipeline data access via VPC Service Controls.',
      cost: 'Varies by model: Gemini 1.5 Flash is highly cost-effective ($0.075 / 1M input tokens).'
    };
    case 'security': return {
      desc: 'Security systems controlling IAM policies, encryption keys (KMS), and sensitive configurations.',
      scaling: 'Highly robust distributed system handling global tokens with zero downtime.',
      security: 'Rotate encryption keys automatically, audit permissions quarterly, and utilize organizational constraint policies.',
      cost: 'Generally free or minimal usage rates (e.g. Secret Manager is $0.06/secret/month).'
    };
    default: return {
      desc: `GCP Infrastructure component: ${label}.`,
      scaling: 'Scales in accordance with Google Cloud platform specifications.',
      security: 'Ensure IAM configurations are audited and restricted to authorized accounts.',
      cost: 'Cost based on platform pricing tables.'
    };
  }
};

// 2. Robust Parser for Mermaid Diagrams
const parseMermaid = (chart: string): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, Node>();

  // Extract pure contents
  const lines = chart
    .replace(/```mermaid/g, '')
    .replace(/```/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('graph') && !l.startsWith('flowchart'));

  lines.forEach((line) => {
    // Check if it's an edge (-->)
    if (line.includes('-->') || line.includes('-.->') || line.includes('==>')) {
      const isDashed = line.includes('-.->');
      const separator = isDashed ? '-.->' : (line.includes('==>') ? '==>' : '-->');
      const parts = line.split(separator);
      
      if (parts.length >= 2) {
        let leftPart = parts[0].trim();
        let rightPart = parts[1].trim();
        let edgeLabel = '';

        if (rightPart.startsWith('|')) {
          const match = rightPart.match(/^\|([^|]+)\|\s*(.+)$/);
          if (match) {
            edgeLabel = match[1].trim();
            rightPart = match[2].trim();
          }
        }

        const parseNodePart = (part: string): string => {
          const bracketMatch = part.match(/^([a-zA-Z0-9_\-]+)\s*(?:\["([^"]+)"\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\))$/);
          if (bracketMatch) {
            const id = bracketMatch[1];
            const label = bracketMatch[2] || bracketMatch[3] || bracketMatch[4] || bracketMatch[5] || id;
            if (!nodeMap.has(id)) {
              const type = detectGcpType(label);
              const node = { id, label, type, level: assignLevel(type) };
              nodes.push(node);
              nodeMap.set(id, node);
            }
            return id;
          }
          
          const plainId = part.replace(/[^a-zA-Z0-9_\-]/g, '').trim();
          if (plainId && !nodeMap.has(plainId)) {
            const type = detectGcpType(part);
            const node = { id: plainId, label: part, type, level: assignLevel(type) };
            nodes.push(node);
            nodeMap.set(plainId, node);
          }
          return plainId;
        };

        const sourceId = parseNodePart(leftPart);
        const targetId = parseNodePart(rightPart);

        if (sourceId && targetId) {
          edges.push({
            id: `${sourceId}-${targetId}-${Math.random().toString(36).substr(2, 4)}`,
            source: sourceId,
            target: targetId,
            label: edgeLabel,
          });
        }
      }
    } else {
      // Single node declaration: A["Label"]
      const match = line.match(/^([a-zA-Z0-9_\-]+)\s*(?:\["([^"]+)"\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\))\s*$/);
      if (match) {
        const id = match[1];
        const label = match[2] || match[3] || match[4] || match[5] || id;
        if (!nodeMap.has(id)) {
          const type = detectGcpType(label);
          const node = { id, label, type, level: assignLevel(type) };
          nodes.push(node);
          nodeMap.set(id, node);
        }
      }
    }
  });

  return { nodes, edges };
};

// SVG Connector dynamic coordinates
const getConnectionPoints = (pSource: Position, pTarget: Position) => {
  const w = 165; // Card width
  const h = 76;  // Card height
  const scx = pSource.x + w / 2;
  const scy = pSource.y + h / 2;
  const tcx = pTarget.x + w / 2;
  const tcy = pTarget.y + h / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;
  const theta = Math.atan2(dy, dx);
  const alpha = Math.atan2(h, w);

  let x1: number, y1: number, x2: number, y2: number;
  let cx1: number, cy1: number, cx2: number, cy2: number;

  // We determine the sector of Target relative to Source using their relative angle
  if (theta >= -alpha && theta <= alpha) {
    // Target is to the RIGHT of Source (Sector 1)
    x1 = pSource.x + w;
    y1 = scy;
    x2 = pTarget.x;
    y2 = tcy;
    
    const controlDist = Math.max(40, Math.abs(x2 - x1) * 0.5);
    cx1 = x1 + controlDist;
    cy1 = y1;
    cx2 = x2 - controlDist;
    cy2 = y2;
  } else if (theta > alpha && theta < Math.PI - alpha) {
    // Target is BELOW Source (Sector 2)
    x1 = scx;
    y1 = pSource.y + h;
    x2 = tcx;
    y2 = pTarget.y;

    const controlDist = Math.max(40, Math.abs(y2 - y1) * 0.5);
    cx1 = x1;
    cy1 = y1 + controlDist;
    cx2 = x2;
    cy2 = y2 - controlDist;
  } else if (theta >= Math.PI - alpha || theta <= -(Math.PI - alpha)) {
    // Target is to the LEFT of Source (Sector 3)
    x1 = pSource.x;
    y1 = scy;
    x2 = pTarget.x + w;
    y2 = tcy;

    const controlDist = Math.max(40, Math.abs(x2 - x1) * 0.5);
    cx1 = x1 - controlDist;
    cy1 = y1;
    cx2 = x2 + controlDist;
    cy2 = y2;
  } else {
    // Target is ABOVE Source (Sector 4)
    x1 = scx;
    y1 = pSource.y;
    x2 = tcx;
    y2 = pTarget.y + h;

    const controlDist = Math.max(40, Math.abs(y2 - y1) * 0.5);
    cx1 = x1;
    cy1 = y1 - controlDist;
    cx2 = x2;
    cy2 = y2 + controlDist;
  }

  return { x1, y1, x2, y2, cx1, cy1, cx2, cy2 };
};

export const GcpNetworkTopology: React.FC<GcpNetworkTopologyProps> = ({ chart, isExpanded = false }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pulseOffset, setPulseOffset] = useState(0);

  // Zoom & Pan Interactive States
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const draggingNode = useRef<string | null>(null);
  const isPanning = useRef(false);
  const lastPointerPos = useRef<Position>({ x: 0, y: 0 });

  const performLayout = () => {
    if (!chart) return;
    const { nodes: parsedNodes, edges: parsedEdges } = parseMermaid(chart);
    setNodes(parsedNodes);
    setEdges(parsedEdges);

    // Group nodes by levels
    const levelGroups: Record<number, string[]> = {};
    parsedNodes.forEach(node => {
      if (!levelGroups[node.level]) levelGroups[node.level] = [];
      levelGroups[node.level].push(node.id);
    });

    const activeLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);
    
    // Dynamic dimensions to prevent overlap!
    const maxNodesInCol = Math.max(...Object.values(levelGroups).map(g => g.length), 1);
    const cardWidth = 165;
    const cardHeight = 76;
    const minGapX = 75; // Expanded horizontal gap to leave ample breathing room
    const minGapY = 35; // Expanded vertical gap to leave ample breathing room

    // Calculate dynamic canvas size based on number of active columns and nodes per column
    const canvasWidth = Math.max(840, activeLevels.length * (cardWidth + minGapX) + 80);
    const canvasHeight = Math.max(440, maxNodesInCol * (cardHeight + minGapY) + 80);

    const paddingX = 80;
    const paddingY = 60;

    const initialPositions: Record<string, Position> = {};

    activeLevels.forEach((level, colIdx) => {
      const nodeIds = levelGroups[level];
      const count = nodeIds.length;
      
      const colX = activeLevels.length > 1 
        ? paddingX + (colIdx * (canvasWidth - paddingX * 2) / (activeLevels.length - 1))
        : canvasWidth / 2;

      nodeIds.forEach((nodeId, rowIdx) => {
        const rowY = count > 1
          ? paddingY + (rowIdx * (canvasHeight - paddingY * 2) / (count - 1))
          : canvasHeight / 2 - cardHeight / 2;

        initialPositions[nodeId] = { x: colX - cardWidth / 2, y: rowY };
      });
    });

    setPositions(initialPositions);
    if (!selectedNode && parsedNodes.length > 0) {
      setSelectedNode(parsedNodes[0]);
    }

    // Now, calculate the optimal scale and centering offsets
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    Object.values(initialPositions).forEach(pos => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x + cardWidth > maxX) maxX = pos.x + cardWidth;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + cardHeight > maxY) maxY = pos.y + cardHeight;
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // Get viewport dimensions
    let viewWidth = 840;
    let viewHeight = 440;

    const activeContainer = isFullscreen ? modalContainerRef.current : containerRef.current;

    if (activeContainer) {
      viewWidth = activeContainer.clientWidth || 840;
      viewHeight = activeContainer.clientHeight || 440;
    } else {
      // Approximate viewport sizes based on current mode
      if (isFullscreen) {
        viewWidth = window.innerWidth * 0.95;
        viewHeight = window.innerHeight * 0.85;
      } else if (isExpanded) {
        viewHeight = 720;
      }
    }
    
    const padding = 50;
    const availableWidth = viewWidth - padding * 2;
    const availableHeight = viewHeight - padding * 2;
    
    let newScale = 1;
    if (graphWidth > 0 && graphHeight > 0) {
      const scaleX = availableWidth / graphWidth;
      const scaleY = availableHeight / graphHeight;
      newScale = Math.min(1.1, Math.min(scaleX, scaleY)); // Allow scaling up to 1.1x for small diagrams
      newScale = Math.max(0.35, newScale); // Allow scaling down to 0.35x for massive ones
    }
    
    const graphCenterX = minX + graphWidth / 2;
    const graphCenterY = minY + graphHeight / 2;
    const viewCenterX = viewWidth / 2;
    const viewCenterY = viewHeight / 2;
    
    const newPanOffset = {
      x: viewCenterX - graphCenterX * newScale,
      y: viewCenterY - graphCenterY * newScale
    };
    
    setScale(newScale);
    setPanOffset(newPanOffset);
  };

  // 3. Initialize / Layout Nodes
  useEffect(() => {
    performLayout();
  }, [chart]);

  // Handle auto-fit when fullscreen view is toggled (gives elements time to re-render in DOM)
  useEffect(() => {
    const timer = setTimeout(() => {
      performLayout();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Animated flow lines logic
  useEffect(() => {
    let animationId: number;
    const step = () => {
      setPulseOffset(prev => (prev - 0.4) % 20);
      animationId = requestAnimationFrame(step);
    };
    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // 4. Pointer Dragging / Panning Handlers
  const handleCardPointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    draggingNode.current = nodeId;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (draggingNode.current) return;
    isPanning.current = true;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (draggingNode.current) {
      const nodeId = draggingNode.current;
      const dx = (e.clientX - lastPointerPos.current.x) / scale;
      const dy = (e.clientY - lastPointerPos.current.y) / scale;

      setPositions(prev => {
        const currentPos = prev[nodeId] || { x: 0, y: 0 };
        return {
          ...prev,
          [nodeId]: {
            x: Math.max(5, Math.min(2500, currentPos.x + dx)),
            y: Math.max(5, Math.min(2500, currentPos.y + dy))
          }
        };
      });
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    } else if (isPanning.current) {
      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;
      
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (draggingNode.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      draggingNode.current = null;
    }
    if (isPanning.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      isPanning.current = false;
    }
  };

  const handleResetLayout = () => {
    performLayout();
  };

  const handleZoomIn = () => setScale(prev => Math.min(2.0, prev + 0.15));
  const handleZoomOut = () => setScale(prev => Math.max(0.3, prev - 0.15));
  const handleResetZoom = () => {
    performLayout();
  };

  const renderToolbar = () => (
    <div className="flex justify-between items-center px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 z-10">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
        <span className="text-xs font-semibold text-slate-300">GCP Network Mesh View</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-all"
          title="Center Diagram"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
        <button
          onClick={handleResetLayout}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-all"
          title="Reset Coordinates & Layout"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-all"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderCanvas = (heightClass: string, isModal: boolean = false) => (
    <div 
      ref={isModal ? modalContainerRef : containerRef}
      className={`flex-1 relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${heightClass}`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
    >
      <div 
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="absolute inset-0 select-none transition-transform duration-75 ease-out"
      >
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          <defs>
            <marker
              id="gcp-arrow-v2"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
            </marker>
            <linearGradient id="neon-flow-grad-v2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {edges.map((edge) => {
            const pSource = positions[edge.source];
            const pTarget = positions[edge.target];
            if (!pSource || !pTarget) return null;

            const { x1, y1, x2, y2, cx1, cy1, cx2, cy2 } = getConnectionPoints(pSource, pTarget);
            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            return (
              <g key={edge.id}>
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="#1e293b" 
                  strokeWidth="4" 
                />
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="#475569" 
                  strokeWidth="1.5" 
                  markerEnd="url(#gcp-arrow-v2)"
                />
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="url(#neon-flow-grad-v2)" 
                  strokeWidth="2" 
                  strokeDasharray="6, 14"
                  strokeDashoffset={pulseOffset}
                />
                {edge.label && (
                  <foreignObject
                    x={(x1 + x2) / 2 - 50}
                    y={(y1 + y2) / 2 - 10}
                    width="100"
                    height="20"
                    className="overflow-visible"
                  >
                    <div className="flex justify-center">
                      <span className="text-[9px] bg-slate-950/90 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-800/80 font-medium whitespace-nowrap shadow-sm select-none">
                        {edge.label}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const pos = positions[node.id] || { x: 0, y: 0 };
          const IconComponent = GcpIcons[node.type] || GcpIcons.default;
          const isSelected = selectedNode?.id === node.id;
          const typeColorClass = getTypeColorClass(node.type);

          return (
            <div
              key={node.id}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(e) => handleCardPointerDown(e, node.id)}
              onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
              className={`absolute w-[165px] h-[76px] px-3.5 py-2.5 rounded-xl border bg-slate-900/95 backdrop-blur-md flex items-center gap-3 cursor-grab active:cursor-grabbing select-none transition-shadow z-10 ${typeColorClass} ${
                isSelected 
                  ? 'border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]' 
                  : ''
              }`}
            >
              <div className="flex-shrink-0 select-none pointer-events-none">
                <IconComponent />
              </div>

              <div className="overflow-hidden flex-1 select-none pointer-events-none">
                <p className="text-white text-xs font-bold leading-tight truncate select-none">
                  {node.label}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold select-none leading-normal">
                  {getTypeName(node.type)}
                </p>
              </div>

              <div className="absolute top-1/2 -translate-y-1/2 left-1 flex flex-col gap-0.5 opacity-30 select-none pointer-events-none">
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-900/60 pointer-events-none select-none z-10">
        <Info className="w-3 h-3 text-cyan-400" />
        <span>Grab Background to Pan • Zoom & Reset to Center • Drag cards to layout customly</span>
      </div>
    </div>
  );

  const renderSidebarContent = () => {
    if (!selectedNode) return null;
    return (
      <>
        <div className="flex justify-between items-start border-b border-slate-800/50 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">GCP Component Audit</span>
            <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
              {selectedNode.label}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">{getTypeName(selectedNode.type)}</p>
          </div>
          <button 
            onClick={() => setSelectedNode(null)} 
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-thin">
          <div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {getServiceDetails(selectedNode.type, selectedNode.label).desc}
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              Elasticity & Scaling
            </span>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              {getServiceDetails(selectedNode.type, selectedNode.label).scaling}
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Security Guidelines
            </span>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              {getServiceDetails(selectedNode.type, selectedNode.label).security}
            </p>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Pricing Dynamics
            </span>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              {getServiceDetails(selectedNode.type, selectedNode.label).cost}
            </p>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* 1. Inline Standard View */}
      {!isFullscreen && (
        <div className="relative flex flex-col md:flex-row gap-5 transition-all duration-300 w-full">
          <div className={`flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden relative transition-all duration-300 ${isExpanded ? 'min-h-[740px]' : 'min-h-[460px]'}`}>
            {renderToolbar()}
            {renderCanvas(isExpanded ? 'h-[720px]' : 'h-[440px]', false)}
          </div>

          {selectedNode && (
            <div className="w-full md:w-[320px] bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 backdrop-blur-md flex flex-col transition-all animate-fadeIn">
              {renderSidebarContent()}
            </div>
          )}
        </div>
      )}

      {/* 2. Expanded Centered Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-scaleIn">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900/90 border-b border-slate-800/80 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="text-sm font-bold text-white">GCP Network Mesh View (Expanded Model)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                <button onClick={handleResetZoom} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Fit to View"><Maximize2 className="w-3.5 h-3.5" /></button>
                <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                <button onClick={handleResetLayout} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 transition-all" title="Reset Coordinates & Layout"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsFullscreen(false)} className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg border border-rose-900/50 transition-all" title="Close Expanded View"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              {renderCanvas('h-full', true)}
              
              {selectedNode && (
                <div className="w-full md:w-[320px] h-full border-t md:border-t-0 md:border-l border-slate-800/80 bg-slate-900/40 p-5 flex flex-col overflow-y-auto">
                  {renderSidebarContent()}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

