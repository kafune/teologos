export interface ContextPassage {
  text: string;
  title: string;
  section?: string;
  page?: number | string;
  url?: string;
  ord: number;
}

export interface PromptBuildParams {
  agent: string;
  message: string;
  context?: ContextPassage[];
}

export interface AskResponseBody {
  answer: string;
  citations: unknown[];
}

export interface LlmCompletionResult {
  answer: string;
  statusCode: number;
}
