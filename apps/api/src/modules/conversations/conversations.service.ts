import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import {
  ConversationListItemDto,
  CreateConversationResponse,
  GetConversationMessagesResponse,
  GetConversationsResponse,
  MessageDto,
} from "@ai-voice-assistant/shared";
import { DataSource } from "typeorm";
import { AppHttpException } from "../../common/errors/app-http.exception";

interface ConversationRow {
  id: string;
  title: string;
  summary: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  sort_timestamp: string;
}

interface ConversationHeaderRow {
  id: string;
  title: string;
  summary: string | null;
}

interface MessageRow {
  id: string;
  seq_no: number;
  role: "user" | "assistant";
  status: "completed" | "failed";
  content_text: string;
  created_at: string;
}

interface ConversationCursor {
  sortTimestamp: string;
  id: string;
}

interface MessageCursor {
  seqNo: number;
}

@Injectable()
export class ConversationsService {
  private static readonly DEFAULT_CONVERSATION_LIMIT = 20;
  private static readonly DEFAULT_MESSAGE_LIMIT = 50;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createConversation(userId: string): Promise<CreateConversationResponse> {
    const rows = await this.dataSource.query<ConversationRow[]>(
      `
        INSERT INTO conversations (user_id)
        VALUES ($1)
        RETURNING
          id,
          title,
          summary,
          message_count,
          last_message_at,
          created_at,
          created_at AS sort_timestamp
      `,
      [userId],
    );

    return {
      conversation: this.mapConversation(rows[0]),
    };
  }

  async getConversations(
    userId: string,
    cursor: string | undefined,
    limitInput: number | undefined,
  ): Promise<GetConversationsResponse> {
    const limit = limitInput ?? ConversationsService.DEFAULT_CONVERSATION_LIMIT;
    const decodedCursor = cursor ? this.decodeConversationCursor(cursor) : null;
    const parameters: unknown[] = [userId];

    let cursorClause = "";
    if (decodedCursor) {
      parameters.push(decodedCursor.sortTimestamp, decodedCursor.id);
      cursorClause = `
        AND (COALESCE(last_message_at, created_at), id) < ($2::timestamptz, $3::uuid)
      `;
    }

    parameters.push(limit + 1);
    const rows = await this.dataSource.query<ConversationRow[]>(
      `
        SELECT
          id,
          title,
          summary,
          message_count,
          last_message_at,
          created_at,
          COALESCE(last_message_at, created_at) AS sort_timestamp
        FROM conversations
        WHERE user_id = $1
        ${cursorClause}
        ORDER BY COALESCE(last_message_at, created_at) DESC, id DESC
        LIMIT $${parameters.length}
      `,
      parameters,
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items[items.length - 1];

    return {
      items: items.map((item) => this.mapConversation(item)),
      nextCursor: hasMore && lastItem ? this.encodeConversationCursor(lastItem) : null,
    };
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    cursor: string | undefined,
    limitInput: number | undefined,
  ): Promise<GetConversationMessagesResponse> {
    const conversation = await this.getOwnedConversationHeader(userId, conversationId);
    const limit = limitInput ?? ConversationsService.DEFAULT_MESSAGE_LIMIT;
    const decodedCursor = cursor ? this.decodeMessageCursor(cursor) : null;
    const parameters: unknown[] = [conversationId];

    let cursorClause = "";
    if (decodedCursor) {
      parameters.push(decodedCursor.seqNo);
      cursorClause = `AND seq_no < $2`;
    }

    parameters.push(limit + 1);
    const rows = await this.dataSource.query<MessageRow[]>(
      `
        SELECT
          id,
          seq_no,
          role,
          status,
          content_text,
          created_at
        FROM messages
        WHERE conversation_id = $1
        ${cursorClause}
        ORDER BY seq_no DESC
        LIMIT $${parameters.length}
      `,
      parameters,
    );

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).reverse();
    const oldestItem = items[0];

    return {
      conversation,
      items: items.map((item) => this.mapMessage(item)),
      nextCursor: hasMore && oldestItem ? this.encodeMessageCursor(oldestItem.seq_no) : null,
    };
  }

  private async getOwnedConversationHeader(
    userId: string,
    conversationId: string,
  ): Promise<{ id: string; title: string; summary: string | null }> {
    const rows = await this.dataSource.query<ConversationHeaderRow[]>(
      `
        SELECT id, title, summary
        FROM conversations
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [conversationId, userId],
    );

    const conversation = rows[0];
    if (!conversation) {
      throw new AppHttpException(
        "CONVERSATION_NOT_FOUND",
        "会话不存在",
        HttpStatus.NOT_FOUND,
      );
    }

    return conversation;
  }

  private mapConversation(row: ConversationRow): ConversationListItemDto {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      messageCount: row.message_count,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
    };
  }

  private mapMessage(row: MessageRow): MessageDto {
    return {
      id: row.id,
      seqNo: row.seq_no,
      role: row.role,
      status: row.status,
      contentText: row.content_text,
      createdAt: row.created_at,
    };
  }

  private encodeConversationCursor(row: ConversationRow): string {
    return Buffer.from(
      JSON.stringify({
        sortTimestamp: row.sort_timestamp,
        id: row.id,
      }),
      "utf8",
    ).toString("base64url");
  }

  private decodeConversationCursor(cursor: string): ConversationCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ConversationCursor>;
      if (
        typeof parsed.sortTimestamp !== "string"
        || typeof parsed.id !== "string"
      ) {
        throw new Error("Invalid conversation cursor");
      }

      return {
        sortTimestamp: parsed.sortTimestamp,
        id: parsed.id,
      };
    } catch {
      throw new AppHttpException(
        "INVALID_CURSOR",
        "分页游标无效",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private encodeMessageCursor(seqNo: number): string {
    return Buffer.from(JSON.stringify({ seqNo }), "utf8").toString("base64url");
  }

  private decodeMessageCursor(cursor: string): MessageCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<MessageCursor>;
      if (typeof parsed.seqNo !== "number") {
        throw new Error("Invalid message cursor");
      }

      return {
        seqNo: parsed.seqNo,
      };
    } catch {
      throw new AppHttpException(
        "INVALID_CURSOR",
        "分页游标无效",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
