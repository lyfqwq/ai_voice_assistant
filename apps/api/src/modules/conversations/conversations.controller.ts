import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  CreateConversationResponse,
  GetConversationMessagesResponse,
  GetConversationsResponse,
} from "@ai-voice-assistant/shared";
import { RequestUser } from "../../common/auth/request-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { GetConversationMessagesQueryDto } from "./dto/get-conversation-messages-query.dto";
import { GetConversationsQueryDto } from "./dto/get-conversations-query.dto";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
@UseGuards(SessionAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  async createConversation(
    @CurrentUser() user: RequestUser,
  ): Promise<CreateConversationResponse> {
    return this.conversationsService.createConversation(user.id);
  }

  @Get()
  async getConversations(
    @CurrentUser() user: RequestUser,
    @Query() query: GetConversationsQueryDto,
  ): Promise<GetConversationsResponse> {
    return this.conversationsService.getConversations(
      user.id,
      query.cursor,
      query.limit,
    );
  }

  @Get(":id/messages")
  async getConversationMessages(
    @CurrentUser() user: RequestUser,
    @Param("id") conversationId: string,
    @Query() query: GetConversationMessagesQueryDto,
  ): Promise<GetConversationMessagesResponse> {
    return this.conversationsService.getConversationMessages(
      user.id,
      conversationId,
      query.cursor,
      query.limit,
    );
  }
}
