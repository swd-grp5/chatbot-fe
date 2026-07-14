import { apiFetch } from "@/shared/lib/api-client";

export const AI_PROVIDER = {
  GEMINI: "gemini",
  OPENAI: "openai",
} as const;

export type AiProvider = (typeof AI_PROVIDER)[keyof typeof AI_PROVIDER];

/** Khớp `ModelSettingResponse` */
export type ModelSetting = {
  id: string;
  provider: string;
  chatModel: string;
  embeddingModel: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  temperature: number | null;
  topK: number | null;
  maxTokens: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Khớp `EffectiveAiConfig` (apiKey bị @JsonIgnore phía BE) */
export type EffectiveAiConfig = {
  provider: string;
  chatModel: string;
  embeddingModel: string;
  temperature: number | null;
  maxTokens: number | null;
  topK: number | null;
  fromDatabase: boolean;
  apiKeyConfigured: boolean;
};

export type ModelSettingPayload = {
  provider: AiProvider | string;
  chatModel: string;
  embeddingModel: string;
  apiKey?: string | null;
  temperature?: number | null;
  topK?: number | null;
  maxTokens?: number | null;
  active?: boolean;
};

export async function fetchModelSettings() {
  return apiFetch<ModelSetting[]>("/model-settings");
}

export async function fetchModelSettingById(id: string) {
  return apiFetch<ModelSetting>(`/model-settings/${id}`);
}

export async function fetchActiveModelSetting() {
  return apiFetch<ModelSetting>("/model-settings/active");
}

export async function fetchEffectiveAiConfig() {
  return apiFetch<EffectiveAiConfig>("/model-settings/effective");
}

export async function createModelSetting(payload: ModelSettingPayload) {
  return apiFetch<ModelSetting>("/model-settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateModelSetting(id: string, payload: ModelSettingPayload) {
  return apiFetch<ModelSetting>(`/model-settings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function activateModelSetting(id: string) {
  return apiFetch<ModelSetting>(`/model-settings/${id}/activate`, {
    method: "PATCH",
  });
}

export async function deleteModelSetting(id: string) {
  return apiFetch<void>(`/model-settings/${id}`, {
    method: "DELETE",
  });
}
