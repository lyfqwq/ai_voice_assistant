export interface ConversationListItemDto {
  id: string;
  title: string;
  summary: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface CreateConversationResponse {
  conversation: ConversationListItemDto;
}

export interface GetConversationsResponse {
  items: ConversationListItemDto[];
  nextCursor: string | null;
}

export interface MessageDto {
  id: string;
  seqNo: number;
  role: "user" | "assistant";
  status: "completed" | "failed";
  contentText: string;
  createdAt: string;
}

export interface GetConversationMessagesResponse {
  conversation: {
    id: string;
    title: string;
    summary: string | null;
  };
  items: MessageDto[];
  nextCursor: string | null;
}

