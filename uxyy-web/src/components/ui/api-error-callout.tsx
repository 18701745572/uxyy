"use client";

import { ApiError, UnauthorizedError } from "@/lib/api/client";
import { recoveryStepsForApiError } from "@/lib/api/error-recovery-hints";
import { formatReportError } from "@/lib/api/reports";
import { Button } from "@/components/ui/button";

export function ApiErrorCallout({
  error,
  onRetry,
  retrying,
  title = "加载失败",
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
}) {
  const text = formatReportError(error);
  const steps = recoveryStepsForApiError(error);
  const isAuth = error instanceof UnauthorizedError;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-100 bg-red-50/90 px-4 py-3 text-sm"
    >
      <p className="font-medium text-red-900">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-red-800/95">{text}</p>
      {steps.length > 0 ? (
        <div className="mt-3 rounded-md border border-red-100/80 bg-white/70 px-3 py-2">
          <p className="text-xs font-medium text-zinc-700">建议尝试：</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && !isAuth ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? "重试中…" : "重试"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function isRetryableApiError(error: unknown): boolean {
  if (error instanceof UnauthorizedError) return false;
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  return true;
}
