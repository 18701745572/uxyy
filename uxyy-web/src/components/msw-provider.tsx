"use client";

import { useEffect, useState, type ReactNode } from "react";

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NEXT_PUBLIC_USE_MOCK !== "true",
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;

    let cancelled = false;
    void import("@/mocks/browser").then(({ worker }) => {
      if (cancelled) return;
      worker.start({ onUnhandledRequest: "bypass" }).then(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
