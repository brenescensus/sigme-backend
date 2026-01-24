export interface JourneyNode {
  id: string;
  type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
  position: { x: number; y: number };
  data: any;
  next?: string | null;
}

export interface EntryNodeData {
  label: string;
}

export interface WaitNodeData {
  duration: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
  };
}

export interface MessageNodeData {
  title: string;
  body: string;
  icon_url?: string;
  image_url?: string;
  click_url?: string;
  actions?: Array<{ label: string; url: string }>;
}

export interface BranchNodeData {
  condition: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  branches: {
    true: string;
    false: string;
  };
}

export interface WebhookNodeData {
  url: string;
  method: 'POST' | 'GET';
  headers?: Record<string, string>;
  payload?: any;
}

export interface JourneyFlowDefinition {
  nodes: Record<string, JourneyNode>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export interface JourneyEntryTrigger {
  type: 'event' | 'segment' | 'manual';
  event_name?: string;
  segment?: string;
  conditions?: Record<string, any>;
}

export interface JourneySettings {
  allow_reentry: boolean;
  max_duration_days: number;
  timezone?: string;
}

export interface Journey {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  entry_trigger: JourneyEntryTrigger;
  flow_definition: JourneyFlowDefinition;
  settings: JourneySettings;
  total_entered: number;
  total_completed: number;
  total_active: number;
  created_at: string;
  updated_at: string;
}