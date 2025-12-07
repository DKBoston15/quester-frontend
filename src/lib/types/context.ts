export type ContextResourceType =
  | "project"
  | "literature"
  | "note"
  | "outcome"
  | "model"
  | "keyword_analysis"
  | "document"
  | "document_chunk";

export interface ContextSelectionItem {
  id: string;
  type: ContextResourceType;
  title: string;
  subtitle?: string;
  projectId?: string | null;
  metadata?: Record<string, any>;
}

