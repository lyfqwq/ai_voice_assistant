export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details: unknown | null;
}

export interface ApiErrorResponse {
  error: ApiError;
}

