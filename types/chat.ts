export type ChatRole = "user" | "agent" | "system";

export type ChatToolStep = {
  name: string;
  status: "start" | "done" | "error";
  detail?: string;
};

export type ChatGroundingChip = {
  kind: "skill" | "unconfirmed";
  label: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  speaker?: string;
  speakerSlug?: string;
  streaming?: boolean;
  working?: boolean;
  toolSteps?: ChatToolStep[];
  grounding?: ChatGroundingChip[];
  modelId?: string | null;
};

export type ChatThread = {
  rentalId: string;
  messages: ChatMessage[];
};
