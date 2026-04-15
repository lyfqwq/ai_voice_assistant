import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { RequestUser } from "../../common/auth/request-user.interface";

export interface AuthenticatedRequest {
  currentUser?: RequestUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.currentUser) {
      throw new Error("Authenticated user was not attached to the request");
    }

    return request.currentUser;
  },
);
