export interface ArchitectureStage {
  title: string;
  summary: string;
  mermaid_diagram: string;
  components: string[];
  terraform_snippet: string;
  estimated_monthly_cost: string;
  design_decisions: string[];
}

export interface ArchitectureDesign {
  mvp: ArchitectureStage;
  growth: ArchitectureStage;
  enterprise: ArchitectureStage;
}

export interface ReviewStage {
  overall_score: number;
  overall_verdict: string;
  security: string[];
  cost: string[];
  reliability: string[];
  top_3_actions: string[];
}

export interface ArchitectureReview {
  mvp: ReviewStage;
  growth: ReviewStage;
  enterprise: ReviewStage;
}

export type AppMode = 'design' | 'review_existing';

export type AuditStrategy = 'default' | 'chaos_monkey' | 'finops' | 'zero_trust';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: {
    data: string;
    mime_type: string;
  } | null;
  designResult?: ArchitectureDesign | null;
  reviewResult?: ArchitectureReview | null;
  constraints?: string[];
  auditStrategy?: AuditStrategy;
  timestamp: string;
}

export interface SavedRun {
  id: string;
  timestamp: string;
  mode: AppMode;
  title: string;
  prompt: string;
  existingArchitecture?: string;
  designResult: ArchitectureDesign | null;
  reviewResult: ArchitectureReview | null;
  chatHistory?: ChatTurn[];
  auditStrategy?: AuditStrategy;
}

export interface AppState {
  mode: AppMode;
  prompt: string;
  existingArchitecture: string;
  image: File | null;
  imageBase64: string | null;
  loading: boolean;
  loadingStep: string;
  designResult: ArchitectureDesign | null;
  reviewResult: ArchitectureReview | null;
  error: string | null;
  activeTab: 'architecture' | 'review' | 'terraform';
  savedRuns: SavedRun[];
  chatHistory: ChatTurn[];
  auditStrategy: AuditStrategy;
}
