import { GoogleGenAI, Type } from '@google/genai';
import { ArchitectureDesign, ArchitectureReview, ChatTurn, AuditStrategy } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const cleanJSONString = (raw: string): string => {
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
};

export const generateArchitecture = async (
  prompt: string,
  imageBase64: string | null,
  mimeType: string | null,
  history: ChatTurn[] | null,
  constraints: string[] | null,
  strategy: AuditStrategy = 'default'
): Promise<ArchitectureDesign> => {
  const parts: any[] = [];
  
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    });
  }
  
  let instructions = `You are an elite Google Cloud Principal Architect. Instead of designing a single static architecture, you must design a complete, evolving architecture progression representing an 'Architecture Time Machine' timeline with three distinct growth phases: MVP, Growth, and Enterprise.
  
  You will design and return all three stages:
  
  Phase 1: MVP (Minimum Viable Product)
  - Purpose: High speed-to-market, minimum operational complexity, and near-zero cost.
  - Compute: Serverless scale-to-zero (Cloud Run with 0 min-instances, Cloud Functions).
  - Storage/Database: Scale-to-zero or free tier (Firestore, simple single-zone Cloud SQL, or Cloud Storage).
  - Networking: Direct access or minimal ingress.
  
  Phase 2: Growth (Medium Scale)
  - Purpose: Horizontal scaling, high availability (HA), database replication, and standard production boundaries.
  - Compute: Managed Instance Groups, GKE, or Cloud Run with autoscale and dedicated min-instances.
  - Storage/Database: High availability (HA) multi-zone databases (Regional Cloud SQL HA, Firestore).
  - Networking: Global External HTTP(S) Load Balancer, basic SSL certificates, regional networking.
  
  Phase 3: Enterprise Ready (Global Scale & Compliance)
  - Purpose: Ironclad security, global scalability, regional disaster recovery, and comprehensive compliance.
  - Compute: Multi-region GKE, multi-region serverless setups, robust autoscaling.
  - Storage/Database: Multi-region highly resilient databases (Cloud Spanner, Multi-Region GCS, highly replicated analytics warehouses like BigQuery).
  - Security/Networking: Global Load Balancer, Google Cloud Armor (WAF & DDoS edge defense), Cloud CDN, fully private VPC networks with Cloud NAT, Secret Manager for encrypted credentials, automated KMS key rotation, Cloud KMS, and Cloud Logging/Monitoring audit trails.

  Rules:
  - Only use Google Cloud services.
  - Include region assumptions.
  - If the user uploads an image, use it as an architecture hint.
  - Return practical architecture decisions, not generic cloud advice.
  - The mermaid_diagram for each stage MUST be raw mermaid syntax (e.g., graph TD...) without markdown code blocks.
  - CRITICAL MERMAID SYNTAX RULES:
    1. Each node declaration and link in the Mermaid diagram MUST be on a distinct new line. NEVER output multiple statements on the same line or compress them.
    2. NEVER use custom or invalid arrow directions/shapes (such as '<---', '<--', '<==', or '<-->'). ONLY use standard directed arrows: '-->' (solid), '-.->' (dotted), or '==>' (thick).
    3. NEVER use the grouping operator '&' (such as 'A --> B & C' or 'A & B --> C'). Every link must be declared individually on a separate line (e.g., 'A --> B' on line 1, 'A --> C' on line 2).
    4. NEVER leave trailing or incomplete connection arrows (such as 'A -->' at the end of the diagram).
    5. If any node label contains parentheses, brackets, or special characters (for example, "HTTP(S)", "VMs", "Auto-scaling", "WAF/DDoS"), you MUST enclose the label in double quotes inside the shape delimiters. For example, use C("External HTTP(S) Load Balancer") instead of C(External HTTP(S) Load Balancer), and D["Cloud Run (Serverless)"] instead of D[Cloud Run (Serverless)].
  - Be extremely concise in all descriptions and lists. Limit explanations to the absolute bare minimum to optimize generation speed.
  - For components: List at most 4-5 core components.
  - For design_decisions: Provide at most 3 key decisions, each under 15 words.
  - For summary: Provide a highly concise 2-sentence summary.
  - For terraform_snippet: Provide a compact, minimal starter snippet of 15-25 lines focusing ONLY on the core service resource block (no excessive variables, locals, or providers) to reduce generation latency.\n\n`;

  if (strategy && strategy !== 'default') {
    instructions += "ACTIVE ANTIGRAVITY AGENT PERSONA / DESIGN STRATEGY:\n";
    const strategyInstructions: Record<string, string> = {
      "chaos_monkey": "PERSONA: The Chaos Monkey (Resilience & DR Specialist).\nFocus heavily on Single-Point-of-Failure (SPOF) resilience. In each of the three stages, build robust redundant failovers, regional/multi-region recovery topologies, automated back-ups, health-check routes, and scale-out triggers to withstand zone or regional outages.",
      "finops": "PERSONA: The FinOps Auditor (Cost-Efficiency Specialist).\nFocus strictly on cost-minimization. Force serverless idle scaling to 0, use budget tiers, avoid redundant regional resources unless absolutely required, and focus on maximizing utilization per dollar in every stage.",
      "zero_trust": "PERSONA: The Zero-Trust Hardener (Security Hardening Specialist).\nImplement absolute zero-trust network boundaries. In every stage, specify completely private subnets, Private Google Access, Serverless VPC Access connectors, Private Service Connect, Secret Manager, customer-managed keys (CMEK) via Cloud KMS, and custom Cloud Armor edge filter policies."
    };
    const strategyInstruction = strategyInstructions[strategy];
    if (strategyInstruction) {
      instructions += `${strategyInstruction}\n\n`;
    }
  }

  if (constraints && constraints.length > 0) {
    instructions += "ACTIVE DESIGN CONSTRAINTS:\n";
    const constraintInstructions: Record<string, string> = {
      "cheapest": "Strictly prioritize cost-optimization, free tiers, scale-to-zero services (like Cloud Run with 0 min instances, Cloud Functions), and Google Cloud's most cost-effective storage/database options.",
      "more secure": "Emphasize extreme security, including private VPCs, Cloud NAT, private service access, Secret Manager, Cloud KMS keys, IAM roles with least privilege, and disabled public IPs.",
      "fastest to build": "Prioritize ease of development and quick time-to-market. Prefer managed services, NoSQL databases like Firestore, simple Serverless runtimes, and minimum setup overhead.",
      "global scale": "Design for massive global traffic and high availability. Use Multi-region databases (e.g. Spanner or multi-region Cloud Storage), Global Load Balancers, Cloud CDN, and multi-region failovers.",
      "student project": "Keep complexity extremely low and cost close to zero. Use basic setups, Cloud Functions or simple Cloud Run services, NoSQL databases with free tier, and avoid expensive load balancers or regional high-availability clusters.",
      "enterprise ready": "Design for enterprise-grade compliance and reliability. Emphasize multi-zone redundancy, Cloud SQL with high availability (HA), robust IAM controls, comprehensive Cloud Logging/Monitoring, backup policies, and disaster recovery."
    };
    for (const constraint of constraints) {
      const instruction = constraintInstructions[constraint.toLowerCase().trim()];
      if (instruction) {
        instructions += `- ${constraint.toUpperCase()}: ${instruction}\n`;
      }
    }
    instructions += "\n";
  }

  if (history && history.length > 0) {
    instructions += "CONVERSATION HISTORY:\n";
    for (const turn of history) {
      const role = turn.role === 'user' ? 'User' : 'Assistant';
      instructions += `[${role}]: ${turn.text}\n`;
    }
    instructions += "\nLATEST USER REQUEST:\n";
  }

  instructions += `User Request: ${prompt}`;

  parts.push({ text: instructions });

  const stageSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A very short, descriptive title for this specific stage of the architecture (max 5 words)." },
      summary: { type: Type.STRING, description: "A highly concise 2-sentence summary of the architecture in this stage." },
      mermaid_diagram: { type: Type.STRING, description: "Raw mermaid.js syntax (e.g. graph TD...). Keep the diagram minimal and clean with max 6-8 nodes to speed up rendering." },
      components: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of max 5 core GCP components used in this stage."
      },
      terraform_snippet: { type: Type.STRING, description: "A very compact, minimal starter Terraform snippet for the core components under 25 lines. Avoid massive blocks, variables, or providers to optimize speed." },
      estimated_monthly_cost: { type: Type.STRING, description: "A rough estimate of monthly cost (e.g., '$0-$10' or '$200-$400')." },
      design_decisions: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Key architectural decisions made for this stage. Max 3 decisions, each max 15 words."
      },
    },
    required: ["title", "summary", "mermaid_diagram", "components", "terraform_snippet", "estimated_monthly_cost", "design_decisions"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      role: 'user',
      parts: parts,
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mvp: stageSchema,
          growth: stageSchema,
          enterprise: stageSchema,
        },
        required: ["mvp", "growth", "enterprise"],
      },
    },
  });

  const jsonStr = cleanJSONString(response.text);
  return JSON.parse(jsonStr) as ArchitectureDesign;
};

export const reviewArchitecture = async (
  design: ArchitectureDesign,
  constraints: string[] | null,
  strategy: AuditStrategy = 'default'
): Promise<ArchitectureReview> => {
  const designContext = JSON.stringify(design, null, 2);
  
  let reviewPrompt = `You are an elite Google Cloud Principal Architect performing a deep architectural audit of three evolving stages (MVP, Growth, Enterprise) of the proposed design.
  You must perform a detailed review for each of the three stages and return a distinct review for each stage under the corresponding key: 'mvp', 'growth', and 'enterprise'.
          
  Rules:
  - Review the specific architecture design provided for each stage.
  - Give concrete findings.
  - Prefer actionable fixes over theory.
  - Keep the tone extremely concise and technical.
  - Force maximum brevity to optimize generation latency: limit findings in security, cost, and reliability categories to at most 2 items each, and each item should be under 15 words.\n\n`;

  if (strategy && strategy !== 'default') {
    reviewPrompt += "ACTIVE ANTIGRAVITY AGENT PERSONA / AUDIT STRATEGY:\n";
    const strategyReviewCriteria: Record<string, string> = {
      "chaos_monkey": "PERSONA: The Chaos Monkey (Resilience & Disaster Recovery).\nAudit findings and scores must be strictly driven by disaster recovery metrics. Check for any single point of failure (SPOF), zone or region outages, backup snapshots frequency, failover lag, and autoscaling elasticity. Proactively recommend chaos injection tests (e.g. Chaos Mesh) and rate the architecture's survive-ability.",
      "finops": "PERSONA: The FinOps Auditor (CostGuard & Optimization).\nAudit findings and scores must be strictly driven by economic efficiency. Check for idle or over-provisioned instances, lack of storage lifecycle rules, failure to utilize Spot VMs or scale-to-zero policies, and lack of billing alarms. Proactively recommend specific commitment discount plans.",
      "zero_trust": "PERSONA: The Zero-Trust Hardener (Absolute Cryptographic & Network Security).\nAudit findings and scores must be strictly driven by identity and network confinement. Check for any public IP exposures, excessive IAM permissions (e.g. Editor role on service accounts), lack of Secret Manager or KMS key rotation rules, and lack of VPC Service Controls boundaries."
    };
    const strategyCriteria = strategyReviewCriteria[strategy];
    if (strategyCriteria) {
      reviewPrompt += `${strategyCriteria}\n\n`;
    }
  }

  if (constraints && constraints.length > 0) {
    reviewPrompt += "ACTIVE DESIGN CONSTRAINTS CRITERIA:\n";
    const constraintCriteria: Record<string, string> = {
      "cheapest": "The architecture MUST be extremely cost-optimized. Review if services can scale-to-zero, use free tiers, and flag any expensive resources (like Cloud Spanner, large GKE clusters, high-tier Cloud SQL) as major issues.",
      "more secure": "The architecture MUST be highly secure. Verify VPC setup, private service connections, identity, KMS, and flag any public IPs, missing firewalls, or unencrypted assets as high issues.",
      "fastest to build": "The architecture should prioritize low operational complexity and quick deployment. Check for heavy components that require long setups and suggest simpler alternatives.",
      "global scale": "The architecture should sustain global scale. Verify the presence of Global Load Balancers, Cloud CDN, multi-region database replications, and identify bottlenecks.",
      "student project": "The architecture should be extremely simple and cost virtually nothing. Flag any complex or expensive services (like enterprise load balancers, dedicated interconnects) as high issues.",
      "enterprise ready": "The architecture must support enterprise reliability, backups, observability, and regional HA. Flag any single point of failure (SPOF), lack of logs, or basic non-HA services."
    };
    for (const constraint of constraints) {
      const criteria = constraintCriteria[constraint.toLowerCase().trim()];
      if (criteria) {
        reviewPrompt += `- ${constraint.toUpperCase()}: ${criteria}\n`;
      }
    }
    reviewPrompt += "\n";
  }

  reviewPrompt += `Architecture to review:
  ${designContext}`;

  const stageReviewSchema = {
    type: Type.OBJECT,
    properties: {
      overall_score: { type: Type.NUMBER, description: "Score out of 100." },
      overall_verdict: { type: Type.STRING, description: "A highly concise, single-sentence verdict." },
      security: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Security findings and recommendations. Strictly max 2 items, each max 15 words." },
      cost: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Cost optimization findings. Strictly max 2 items, each max 15 words." },
      reliability: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Reliability and scaling findings. Strictly max 2 items, each max 15 words." },
      top_3_actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The top 3 most important actions to take. Keep each action item extremely short (max 15 words)." },
    },
    required: ["overall_score", "overall_verdict", "security", "cost", "reliability", "top_3_actions"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      role: 'user',
      parts: [
        {
          text: reviewPrompt,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mvp: stageReviewSchema,
          growth: stageReviewSchema,
          enterprise: stageReviewSchema,
        },
        required: ["mvp", "growth", "enterprise"],
      },
    },
  });

  const jsonStr = cleanJSONString(response.text);
  return JSON.parse(jsonStr) as ArchitectureReview;
};

export const reviewExistingArchitecture = async (
  architectureDetails: string,
  imageBase64: string | null,
  mimeType: string | null,
  constraints: string[] | null,
  strategy: AuditStrategy = 'default'
): Promise<ArchitectureReview> => {
  const parts: any[] = [];
  
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    });
  }
  
  let instructions = `You are an elite Google Cloud Principal Architect reviewing the user's existing architecture details.
  
  Instead of a static checklist, you must formulate an evolving roadmap representing an 'Architecture Time Machine' with three evolutionary feedback and optimization phases:
  
  1. MVP Stage: Focus on immediate quick-wins, critical vulnerability patches, low-hanging fruit, and low-complexity cost-saving measures.
  2. Growth Stage: Focus on mid-term scalability upgrades, regional redundancy, HA database failovers, and robust continuous deployment practices.
  3. Enterprise Stage: Focus on long-term enterprise security, advanced Edge defense (Cloud Armor), Spanner/Global multi-region replication, continuous logging/monitoring, and full compliance postures.
  
  You must produce a distinct review/feedback report for each of these three evolutionary stages ('mvp', 'growth', 'enterprise').
  
  Rules:
  - Provide concrete, highly actionable findings.
  - Prefer practical fixes over theory.
  - Keep the tone extremely concise, professional, and technical.
  - Force maximum brevity to optimize generation latency: limit findings in security, cost, and reliability categories to at most 2 items each, and each item should be under 15 words.\n\n`;

  if (strategy && strategy !== 'default') {
    instructions += "ACTIVE ANTIGRAVITY AGENT PERSONA / AUDIT STRATEGY:\n";
    const strategyReviewCriteria: Record<string, string> = {
      "chaos_monkey": "PERSONA: The Chaos Monkey (Resilience & Disaster Recovery).\nAudit findings and scores must be strictly driven by disaster recovery metrics. Check for any single point of failure (SPOF), zone or region outages, backup snapshots frequency, failover lag, and autoscaling elasticity. Proactively recommend chaos injection tests (e.g. Chaos Mesh) and rate the architecture's survive-ability.",
      "finops": "PERSONA: The FinOps Auditor (CostGuard & Optimization).\nAudit findings and scores must be strictly driven by economic efficiency. Check for idle or over-provisioned instances, lack of storage lifecycle rules, failure to utilize Spot VMs or scale-to-zero policies, and lack of billing alarms. Proactively recommend specific commitment discount plans.",
      "zero_trust": "PERSONA: The Zero-Trust Hardener (Absolute Cryptographic & Network Security).\nAudit findings and scores must be strictly driven by identity and network confinement. Check for any public IP exposures, excessive IAM permissions (e.g. Editor role on service accounts), lack of Secret Manager or KMS key rotation rules, and lack of VPC Service Controls boundaries."
    };
    const strategyCriteria = strategyReviewCriteria[strategy];
    if (strategyCriteria) {
      instructions += `${strategyCriteria}\n\n`;
    }
  }

  if (constraints && constraints.length > 0) {
    instructions += "ACTIVE DESIGN CONSTRAINTS CRITERIA:\n";
    const constraintCriteria: Record<string, string> = {
      "cheapest": "The architecture MUST be extremely cost-optimized. Review if services can scale-to-zero, use free tiers, and flag any expensive resources (like Cloud Spanner, large GKE clusters, high-tier Cloud SQL) as major issues.",
      "more secure": "The architecture MUST be highly secure. Verify VPC setup, private service connections, identity, KMS, and flag any public IPs, missing firewalls, or unencrypted assets as high issues.",
      "fastest to build": "The architecture should prioritize low operational complexity and quick deployment. Check for heavy components that require long setups and suggest simpler alternatives.",
      "global scale": "The architecture should sustain global scale. Verify the presence of Global Load Balancers, Cloud CDN, multi-region database replications, and identify bottlenecks.",
      "student project": "The architecture should be extremely simple and cost virtually nothing. Flag any complex or expensive services (like enterprise load balancers, dedicated interconnects) as high issues.",
      "enterprise ready": "The architecture must support enterprise reliability, backups, observability, and regional HA. Flag any single point of failure (SPOF), lack of logs, or basic non-HA services."
    };
    for (const constraint of constraints) {
      const criteria = constraintCriteria[constraint.toLowerCase().trim()];
      if (criteria) {
        instructions += `- ${constraint.toUpperCase()}: ${criteria}\n`;
      }
    }
    instructions += "\n";
  }

  instructions += `Existing Architecture Details:
  ${architectureDetails}`;

  parts.push({ text: instructions });

  const stageReviewSchema = {
    type: Type.OBJECT,
    properties: {
      overall_score: { type: Type.NUMBER, description: "Score out of 100." },
      overall_verdict: { type: Type.STRING, description: "A highly concise, single-sentence verdict." },
      security: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Security findings and recommendations. Strictly max 2 items, each max 15 words." },
      cost: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Cost optimization findings. Strictly max 2 items, each max 15 words." },
      reliability: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Reliability and scaling findings. Strictly max 2 items, each max 15 words." },
      top_3_actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The top 3 most important actions to take. Keep each action item extremely short (max 15 words)." },
    },
    required: ["overall_score", "overall_verdict", "security", "cost", "reliability", "top_3_actions"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      role: 'user',
      parts: parts,
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mvp: stageReviewSchema,
          growth: stageReviewSchema,
          enterprise: stageReviewSchema,
        },
        required: ["mvp", "growth", "enterprise"],
      },
    },
  });

  const jsonStr = cleanJSONString(response.text);
  return JSON.parse(jsonStr) as ArchitectureReview;
};
