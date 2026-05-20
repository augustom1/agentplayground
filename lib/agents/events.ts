export interface BlockedEvent {
  taskId: string;
  teamId: string;
  planId: string;
  reason: string;
  requiredFields: {
    key: string;
    label: string;
    type: "text" | "password" | "number" | "select";
    options?: string[];
  }[];
}

export interface TaskResult {
  taskId: string;
  content: string;
  summary: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
}
