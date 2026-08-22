export interface AgentMessage {
  id: string;
  sender: string;
  recipient: string;
  action: string;
  payload: any;
  timestamp: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'executing' | 'waiting' | 'error';
  lastActive: string;
  currentTask?: string;
  metrics?: Record<string, any>;
}

export interface MarketingAgentMetric {
  name: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}
