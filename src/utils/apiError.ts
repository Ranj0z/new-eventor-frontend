import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { SerializedError } from "@reduxjs/toolkit";

type ApiError = FetchBaseQueryError | SerializedError | undefined;

// Backend error bodies are consistently { message: string } (see
// api-endpoints.md) — these two helpers let call sites branch on the HTTP
// status and surface that message instead of a generic fallback string.

export function hasStatus(error: ApiError, status: number): error is FetchBaseQueryError {
  return !!error && "status" in error && error.status === status;
}

export function getApiErrorMessage(error: ApiError): string | undefined {
  if (!error || !("data" in error)) return undefined;
  const data = error.data;
  if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
    return (data as { message: string }).message;
  }
  return undefined;
}
