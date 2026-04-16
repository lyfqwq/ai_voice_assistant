import type {
  ChatSseAckEvent,
  ChatSseCompletedEvent,
  ChatSseConversationUpdatedEvent,
  ChatSseDeltaEvent,
  ChatSseDoneEvent,
  ChatSseErrorEvent,
  ChatSseProfileUpdatedEvent,
  CreateConversationResponse,
  GetConversationMessagesResponse,
  GetConversationsResponse,
  GetLearningProfileResponse,
  MeResponse,
  PatchLearningProfileRequest,
  PatchLearningProfileResponse,
  PostConversationMessageRequest,
  SendCodeRequest,
  SendCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from "@ai-voice-assistant/shared";

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;
  let code: string | null = null;

  try {
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    message = payload.error?.message ?? message;
    code = payload.error?.code ?? null;
  } catch {
    // Ignore non-JSON error bodies and keep the fallback message.
  }

  throw new ApiError(message, response.status, code);
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return (await response.json()) as T;
}

export async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return response;
}

export async function getCurrentUser(): Promise<MeResponse> {
  return fetchJson<MeResponse>("/api/me");
}

export async function sendCode(payload: SendCodeRequest): Promise<SendCodeResponse> {
  return fetchJson<SendCodeResponse>("/api/auth/send-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function verifyCode(payload: VerifyCodeRequest): Promise<VerifyCodeResponse> {
  return fetchJson<VerifyCodeResponse>("/api/auth/verify-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", {
    method: "POST",
  });
}

export async function getLearningProfile(): Promise<GetLearningProfileResponse> {
  return fetchJson<GetLearningProfileResponse>("/api/learning-profile");
}

export async function patchLearningProfile(
  payload: PatchLearningProfileRequest,
): Promise<PatchLearningProfileResponse> {
  return fetchJson<PatchLearningProfileResponse>("/api/learning-profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function createConversation(): Promise<CreateConversationResponse> {
  return fetchJson<CreateConversationResponse>("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  });
}

export async function getConversations(): Promise<GetConversationsResponse> {
  return fetchJson<GetConversationsResponse>("/api/conversations");
}

export async function getConversationMessages(
  conversationId: string,
): Promise<GetConversationMessagesResponse> {
  return fetchJson<GetConversationMessagesResponse>(`/api/conversations/${conversationId}/messages`);
}

type ChatSseHandlers = {
  onAck?: (payload: ChatSseAckEvent) => void;
  onDelta?: (payload: ChatSseDeltaEvent) => void;
  onCompleted?: (payload: ChatSseCompletedEvent) => void;
  onConversationUpdated?: (payload: ChatSseConversationUpdatedEvent) => void;
  onProfileUpdated?: (payload: ChatSseProfileUpdatedEvent) => void;
  onError?: (payload: ChatSseErrorEvent) => void;
  onDone?: (payload: ChatSseDoneEvent) => void;
};

export async function postConversationMessageStream(
  conversationId: string,
  payload: PostConversationMessageRequest,
  handlers: ChatSseHandlers,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    return parseError(response);
  }

  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let buffer = "";

  const dispatchEvent = (eventName: string, dataLine: string) => {
    const payload = JSON.parse(dataLine);

    switch (eventName) {
      case "ack":
        handlers.onAck?.(payload as ChatSseAckEvent);
        break;
      case "delta":
        handlers.onDelta?.(payload as ChatSseDeltaEvent);
        break;
      case "completed":
        handlers.onCompleted?.(payload as ChatSseCompletedEvent);
        break;
      case "conversation.updated":
        handlers.onConversationUpdated?.(payload as ChatSseConversationUpdatedEvent);
        break;
      case "profile.updated":
        handlers.onProfileUpdated?.(payload as ChatSseProfileUpdatedEvent);
        break;
      case "error":
        handlers.onError?.(payload as ChatSseErrorEvent);
        break;
      case "done":
        handlers.onDone?.(payload as ChatSseDoneEvent);
        break;
      default:
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const rawEvent = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);

      if (rawEvent) {
        const lines = rawEvent.split(/\r?\n/);
        const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();

        if (eventName && dataLine) {
          dispatchEvent(eventName, dataLine);
        }
      }

      separatorIndex = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }
}
