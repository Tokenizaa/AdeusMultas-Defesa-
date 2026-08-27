export type AutomationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

export interface AutomationStatusResponse {
  status: AutomationStatus;
  lastError?: string | null;
  lastProcessedAt?: string | null;
  processedCount?: number;
  [key: string]: any;
}

export interface HealthResponse {
  database: {
    status: string;
    latencyMs?: number;
    error?: string | null;
  };
  queue: {
    status: string;
    pendingJobs?: number;
  };
  worker: {
    status: string;
    processedCount?: number;
    lastError?: string | null;
    lastProcessedAt?: string | null;
  };
  evolution: {
    status: string;
    instance?: string;
    phone?: string | null;
  };
  lastError?: string | null;
}

export interface StatsResponse {
  totalLeads: number;
  totalCampaigns?: number;
  queued: number;
  sent?: number;
  contacted: number;
  responded: number;
  interested: number;
  converted: number;
  exhausted?: number;
  totalMessages?: number;
  pendingQueue?: number;
  errors?: number;
  [key: string]: any;
}

export interface CampaignStep {
  step: number;
  delay_hours: number;
  message: string;
}

export interface CampaignMetrics {
  total: number;
  queued: number;
  sent: number;
  contacted: number;
  responded: number;
  converted: number;
  exhausted: number;
  responseRate: number;
  conversionRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  lead_type?: string;
  status?: string;
  target_cities?: string[];
  steps?: CampaignStep[];
  max_contacts?: number;
  min_interval_hours?: number;
  target_audience?: string;
  total_leads?: number;
  metrics?: CampaignMetrics;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Lead {
  id: string;
  name: string;
  lead_type?: string;
  category?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  source?: string;
  scraped_at?: string;
  address?: string;
  zip_code?: string;
  phone_normalized?: string | null;
  source_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  campaigns?: any[];
  messages?: any[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface PaginatedLeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableCities: string[];
  availableSources: string[];
}

export interface QueueJob {
  id: string;
  action: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  last_error?: string | null;
  lead_campaign?: {
    lead?: {
      name?: string;
      phone?: string;
      whatsapp?: string;
      city?: string;
      [key: string]: any;
    };
    campaign?: {
      name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

