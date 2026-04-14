export interface PostConversationMessageRequest {
  content: string;
}

export interface ChatSseAckEvent {
  requestId: string;
  conversationId: string;
  assistantMessageId: string;
}

export interface ChatSseDeltaEvent {
  assistantMessageId: string;
  delta: string;
  accumulatedLength: number;
}

export interface ChatSseCompletedEvent {
  assistantMessage: {
    id: string;
    seqNo: number;
    role: "assistant";
    status: "completed";
    contentText: string;
    createdAt: string;
  };
}

export interface ChatSseConversationUpdatedEvent {
  conversation: {
    id: string;
    title: string;
    summary: string | null;
    messageCount: number;
    lastMessageAt: string | null;
  };
}

export interface ChatSseProfileUpdatedEvent {
  profilePatch: {
    recentTopics?: string[];
    derivedWeakPoints?: string[];
    progressNotes?: string;
  };
}

export interface ChatSseErrorEvent {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ChatSseDoneEvent {
  requestId: string;
}
