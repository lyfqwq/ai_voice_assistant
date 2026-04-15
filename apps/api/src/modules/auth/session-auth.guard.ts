import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest } from "./current-user.decorator";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { headers: { cookie?: string } }>();
    request.currentUser = await this.authService.authenticateRequest(request.headers.cookie);
    return true;
  }
}
