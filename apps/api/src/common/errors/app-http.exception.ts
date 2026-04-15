import { HttpException, HttpStatus } from "@nestjs/common";

export class AppHttpException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
    public readonly errorDetails: unknown = null,
  ) {
    super(
      {
        code: errorCode,
        message,
        details: errorDetails,
      },
      status,
    );
  }
}
