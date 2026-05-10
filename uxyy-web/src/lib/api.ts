import { apiFetch } from "./api/client";

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export { apiFetch } from "./api/client";
export type { ApiError, UnauthorizedError } from "./api/client";
