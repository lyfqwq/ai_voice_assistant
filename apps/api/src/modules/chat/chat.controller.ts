import { Body, Controller, Param, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { RequestUser } from "../../common/auth/request-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { PostConversationMessageDto } from "./dto/post-conversation-message.dto";
import { ChatService } from "./chat.service";

@Controller("conversations")
@UseGuards(SessionAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post(":id/messages")
  async postConversationMessage(
    @CurrentUser() user: RequestUser,
    @Param("id") conversationId: string,
    @Body() body: PostConversationMessageDto,
    @Res() response: Response,
  ): Promise<void> {
    await this.chatService.streamConversationReply(
      user.id,
      conversationId,
      body.content,
      response,
    );
  }
}
