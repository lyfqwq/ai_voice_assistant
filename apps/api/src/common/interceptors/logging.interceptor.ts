import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AppLoggerService } from "../logger/app-logger.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; url: string; originalUrl?: string }>();
    const startedAt = Date.now();
    const method = request.method;
    const url = request.originalUrl ?? request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${Date.now() - startedAt}ms`,
            "HTTP",
          );
        },
        error: (error: unknown) => {
          const statusCode =
            typeof error === "object" && error && "status" in error
              ? String((error as { status: number }).status)
              : "500";
          this.logger.error(
            `${method} ${url} ${statusCode} ${Date.now() - startedAt}ms`,
            error instanceof Error ? error.stack : undefined,
            "HTTP",
          );
        },
      }),
    );
  }
}
