import { NextResponse } from "next/server";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "INVALID_TRANSITION"
  | "RATE_LIMITED"
  | "CSV_MISSING_COLUMNS"
  | "CSV_EMPTY"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface ApiError {
  error: string;
  code: ErrorCode;
  status: number;
}

export function apiError(
  message: string,
  code: ErrorCode,
  httpStatus: number,
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code, status: httpStatus },
    { status: httpStatus },
  );
}

export const unauthorized = (msg = "Unauthorized") =>
  apiError(msg, "UNAUTHORIZED", 401);

export const forbidden = (msg = "Forbidden") =>
  apiError(msg, "FORBIDDEN", 403);

export const notFound = (resource = "Resource") =>
  apiError(`${resource} not found.`, "NOT_FOUND", 404);

export const conflict = (msg: string) =>
  apiError(msg, "CONFLICT", 409);

export const validationError = (msg: string) =>
  apiError(msg, "VALIDATION_ERROR", 400);

export const invalidTransition = (msg: string) =>
  apiError(msg, "INVALID_TRANSITION", 400);

export const internalError = (msg = "An unexpected error occurred.") =>
  apiError(msg, "INTERNAL_ERROR", 500);

export function rateLimited(retryAfterSeconds: number): NextResponse<ApiError> {
  return NextResponse.json(
    { error: "Too many requests.", code: "RATE_LIMITED" as ErrorCode, status: 429 },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
