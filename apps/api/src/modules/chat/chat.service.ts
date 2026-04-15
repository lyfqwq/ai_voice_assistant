import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { Response } from "express";
import { DataSource } from "typeorm";
import { AppHttpException } from "../../common/errors/app-http.exception";
import {
  ChatSseAckEvent,
  ChatSseCompletedEvent,
  ChatSseConversationUpdatedEvent,
  ChatSseDeltaEvent,
  ChatSseDoneEvent,
  ChatSseErrorEvent,
  ChatSseProfileUpdatedEvent,
} from "@ai-voice-assistant/shared";

interface ConversationStateRow {
  id: string;
  title: string;
  title_generated: boolean;
  summary: string | null;
  message_count: number;
}

interface MessageContextRow {
  role: "user" | "assistant";
  content_text: string;
}

interface InsertedMessageRow {
  id: string;
  seq_no: number;
  created_at: string;
}

interface ConversationUpdatedRow {
  id: string;
  title: string;
  summary: string | null;
  message_count: number;
  last_message_at: string | null;
}

interface LearningProfileUpdateRow {
  recent_topics: string[];
  progress_notes: string | null;
}

interface OpenAiStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async streamConversationReply(
    userId: string,
    conversationId: string,
    content: string,
    response: Response,
  ): Promise<void> {
    const requestId = randomUUID();
    const assistantMessageId = randomUUID();

    this.prepareSseResponse(response);

    try {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new AppHttpException(
          "EMPTY_MESSAGE",
          "消息内容不能为空",
          HttpStatus.BAD_REQUEST,
        );
      }

      const userMessage = await this.insertUserMessage(userId, conversationId, trimmedContent);
      this.writeEvent<ChatSseAckEvent>(response, "ack", {
        requestId,
        conversationId,
        assistantMessageId,
      });

      const contextMessages = await this.getConversationContext(conversationId);
      const assistantContent = await this.streamModelResponse(
        response,
        assistantMessageId,
        contextMessages,
      );

      if (!assistantContent.trim()) {
        throw new AppHttpException(
          "EMPTY_MODEL_RESPONSE",
          "模型未返回有效内容，请稍后重试",
          HttpStatus.BAD_GATEWAY,
        );
      }

      const finalized = await this.finalizeAssistantMessage(
        userId,
        conversationId,
        assistantMessageId,
        userMessage.contentText,
        assistantContent,
      );

      this.writeEvent<ChatSseCompletedEvent>(response, "completed", {
        assistantMessage: {
          id: finalized.assistantMessage.id,
          seqNo: finalized.assistantMessage.seqNo,
          role: "assistant",
          status: "completed",
          contentText: finalized.assistantMessage.contentText,
          createdAt: finalized.assistantMessage.createdAt,
        },
      });

      this.writeEvent<ChatSseConversationUpdatedEvent>(response, "conversation.updated", {
        conversation: finalized.conversation,
      });

      if (finalized.profilePatch) {
        this.writeEvent<ChatSseProfileUpdatedEvent>(response, "profile.updated", {
          profilePatch: finalized.profilePatch,
        });
      }

      this.writeEvent<ChatSseDoneEvent>(response, "done", { requestId });
    } catch (error) {
      const event = this.toErrorEvent(error);
      this.writeEvent<ChatSseErrorEvent>(response, "error", event);
      this.writeEvent<ChatSseDoneEvent>(response, "done", { requestId });
    } finally {
      response.end();
    }
  }

  private prepareSseResponse(response: Response): void {
    response.status(HttpStatus.OK);
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
  }

  private async insertUserMessage(
    userId: string,
    conversationId: string,
    contentText: string,
  ): Promise<{ id: string; seqNo: number; contentText: string }> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const conversations = await transactionalEntityManager.query<ConversationStateRow[]>(
        `
          SELECT id, title, title_generated, summary, message_count
          FROM conversations
          WHERE id = $1 AND user_id = $2
          FOR UPDATE
        `,
        [conversationId, userId],
      );

      const conversation = conversations[0];
      if (!conversation) {
        throw new AppHttpException(
          "CONVERSATION_NOT_FOUND",
          "会话不存在",
          HttpStatus.NOT_FOUND,
        );
      }

      const nextSeqNo = conversation.message_count + 1;
      const rows = await transactionalEntityManager.query<InsertedMessageRow[]>(
        `
          INSERT INTO messages (conversation_id, seq_no, role, status, content_text)
          VALUES ($1, $2, 'user', 'completed', $3)
          RETURNING id, seq_no, created_at
        `,
        [conversationId, nextSeqNo, contentText],
      );

      await transactionalEntityManager.query(
        `
          UPDATE conversations
          SET
            message_count = message_count + 1,
            last_message_at = $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [conversationId, rows[0].created_at],
      );

      return {
        id: rows[0].id,
        seqNo: rows[0].seq_no,
        contentText,
      };
    });
  }

  private async getConversationContext(conversationId: string): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
    const rows = await this.dataSource.query<MessageContextRow[]>(
      `
        SELECT role, content_text
        FROM messages
        WHERE conversation_id = $1
        ORDER BY seq_no ASC
      `,
      [conversationId],
    );

    return [
      {
        role: "system",
        content: "你是一个中文学习陪练助手。回答要清晰、耐心、可执行，优先帮助用户学习与持续练习。",
      },
      ...rows.map((row) => ({
        role: row.role,
        content: row.content_text,
      })),
    ];
  }

  private async streamModelResponse(
    response: Response,
    assistantMessageId: string,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<string> {
    const apiResponse = await fetch(
      `${this.configService.getOrThrow<string>("modelBaseUrl")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.configService.getOrThrow<string>("modelApiKey")}`,
        },
        body: JSON.stringify({
          model: this.configService.getOrThrow<string>("modelName"),
          stream: true,
          messages,
        }),
      },
    );

    if (!apiResponse.ok || !apiResponse.body) {
      const errorText = await apiResponse.text();
      throw new AppHttpException(
        "MODEL_REQUEST_FAILED",
        "模型请求失败，请稍后重试",
        HttpStatus.BAD_GATEWAY,
        errorText.slice(0, 500),
      );
    }

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"));

        for (const line of lines) {
          const payload = line.slice(5).trim();
          if (!payload) {
            continue;
          }

          if (payload === "[DONE]") {
            continue;
          }

          const chunk = JSON.parse(payload) as OpenAiStreamChunk;
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (!delta) {
            continue;
          }

          accumulated += delta;
          this.writeEvent<ChatSseDeltaEvent>(response, "delta", {
            assistantMessageId,
            delta,
            accumulatedLength: accumulated.length,
          });
        }
      }
    }

    return accumulated;
  }

  private async finalizeAssistantMessage(
    userId: string,
    conversationId: string,
    assistantMessageId: string,
    userPrompt: string,
    assistantContent: string,
  ): Promise<{
    assistantMessage: {
      id: string;
      seqNo: number;
      contentText: string;
      createdAt: string;
    };
    conversation: {
      id: string;
      title: string;
      summary: string | null;
      messageCount: number;
      lastMessageAt: string | null;
    };
    profilePatch: {
      recentTopics?: string[];
      derivedWeakPoints?: string[];
      progressNotes?: string;
    } | null;
  }> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const conversations = await transactionalEntityManager.query<ConversationStateRow[]>(
        `
          SELECT id, title, title_generated, summary, message_count
          FROM conversations
          WHERE id = $1 AND user_id = $2
          FOR UPDATE
        `,
        [conversationId, userId],
      );

      const conversation = conversations[0];
      if (!conversation) {
        throw new AppHttpException(
          "CONVERSATION_NOT_FOUND",
          "会话不存在",
          HttpStatus.NOT_FOUND,
        );
      }

      const assistantSeqNo = conversation.message_count + 1;
      const insertedMessages = await transactionalEntityManager.query<InsertedMessageRow[]>(
        `
          INSERT INTO messages (id, conversation_id, seq_no, role, status, content_text)
          VALUES ($1, $2, $3, 'assistant', 'completed', $4)
          RETURNING id, seq_no, created_at
        `,
        [assistantMessageId, conversationId, assistantSeqNo, assistantContent],
      );

      const shouldGenerateTitle = !conversation.title_generated && conversation.message_count === 1;
      const generatedTitle = shouldGenerateTitle
        ? this.generateConversationTitle(userPrompt)
        : conversation.title;

      await transactionalEntityManager.query(
        `
          UPDATE conversations
          SET
            title = $2,
            title_generated = CASE WHEN $3 THEN true ELSE title_generated END,
            message_count = message_count + 1,
            last_message_at = $4,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          conversationId,
          generatedTitle,
          shouldGenerateTitle,
          insertedMessages[0].created_at,
        ],
      );

      const updatedConversations = await transactionalEntityManager.query<ConversationUpdatedRow[]>(
        `
          SELECT id, title, summary, message_count, last_message_at
          FROM conversations
          WHERE id = $1
          LIMIT 1
        `,
        [conversationId],
      );

      const profilePatch = await this.updateLearningProfilePatch(
        transactionalEntityManager,
        userId,
        generatedTitle,
      );

      return {
        assistantMessage: {
          id: insertedMessages[0].id,
          seqNo: insertedMessages[0].seq_no,
          contentText: assistantContent,
          createdAt: insertedMessages[0].created_at,
        },
        conversation: {
          id: updatedConversations[0].id,
          title: updatedConversations[0].title,
          summary: updatedConversations[0].summary,
          messageCount: updatedConversations[0].message_count,
          lastMessageAt: updatedConversations[0].last_message_at,
        },
        profilePatch,
      };
    });
  }

  private async updateLearningProfilePatch(
    transactionalEntityManager: DataSource["manager"],
    userId: string,
    topic: string,
  ): Promise<ChatSseProfileUpdatedEvent["profilePatch"] | null> {
    const rows = await transactionalEntityManager.query<LearningProfileUpdateRow[]>(
      `
        SELECT recent_topics, progress_notes
        FROM learning_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    const profile = rows[0];
    if (!profile) {
      return null;
    }

    const dedupedTopics = [topic, ...profile.recent_topics.filter((item) => item !== topic)].slice(0, 5);
    const progressNotes = `最近讨论了：${topic}`;

    await transactionalEntityManager.query(
      `
        UPDATE learning_profiles
        SET
          recent_topics = $2::text[],
          progress_notes = $3,
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId, dedupedTopics, progressNotes],
    );

    return {
      recentTopics: dedupedTopics,
      progressNotes,
    };
  }

  private generateConversationTitle(userPrompt: string): string {
    const normalized = userPrompt
      .replace(/\s+/g, " ")
      .replace(/[，。！？!?,.:：；;]/g, " ")
      .trim();

    if (!normalized) {
      return "新对话";
    }

    return normalized.slice(0, 20) || "新对话";
  }

  private writeEvent<T>(response: Response, eventName: string, payload: T): void {
    response.write(`event: ${eventName}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  private toErrorEvent(error: unknown): ChatSseErrorEvent {
    if (error instanceof AppHttpException) {
      return {
        code: error.errorCode,
        message: error.message,
        retryable: error.getStatus() >= 500,
      };
    }

    if (error instanceof Error) {
      return {
        code: "INTERNAL_ERROR",
        message: error.message,
        retryable: true,
      };
    }

    return {
      code: "INTERNAL_ERROR",
      message: "服务暂时不可用，请稍后重试",
      retryable: true,
    };
  }
}
