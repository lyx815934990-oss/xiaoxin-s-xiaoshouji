import { type AiConfig } from "../context/SettingsContext";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelInfo {
  id: string;
  [key: string]: unknown;
}

function buildRootAndChatUrl(baseUrl: string): { root: string; chatUrl: string } {
  const trimmed = baseUrl.replace(/\s+/g, "");
  const root = trimmed.replace(/\/+(chat\/completions|completions)\/*$/i, "");
  const normalizedRoot = root.replace(/\/+$/g, "");
  const chatUrl = `${normalizedRoot}/chat/completions`;
  return { root: normalizedRoot, chatUrl };
}

export async function sendChatRequest(
  config: AiConfig,
  messages: ChatMessage[]
): Promise<string> {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("缺少 AI 配置：请在 设置 → AI 接口配置 中填好信息。");
  }

  const { chatUrl } = buildRootAndChatUrl(config.baseUrl);

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`请求失败：${response.status} ${text}`);
  }

  const data = (await response.json()) as any;
  const content =
    data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.content ?? "";

  if (!content) {
    throw new Error("AI 没有返回内容，请检查接口格式是否兼容 OpenAI 风格。");
  }

  return content;
}

export async function fetchModels(config: AiConfig): Promise<ModelInfo[]> {
  if (!config.baseUrl || !config.apiKey) {
    throw new Error("请先填写 API Base URL 和 API Key。");
  }

  const { root } = buildRootAndChatUrl(config.baseUrl);
  const url = `${root}/models`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`拉取模型失败：${response.status} ${text}`);
  }

  const data = (await response.json()) as any;
  const list: any[] = data?.data ?? data?.models ?? [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("接口返回中没有发现模型列表，请确认是否为 OpenAI 兼容接口。");
  }

  return list.map((m) => ({
    id: m.id ?? m.name ?? "unknown-model",
    ...m
  }));
}


