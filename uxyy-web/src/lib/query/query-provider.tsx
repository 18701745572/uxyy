"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { QUERY_STALE_MS } from "./defaults";

function ReactQueryDevtoolsLazy() {
  const [Panel, setPanel] = useState<ComponentType<{
    buttonPosition: "bottom-left" | "top-right";
  }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let cancelled = false;
    void import("@tanstack/react-query-devtools").then((mod) => {
      if (!cancelled) {
        setPanel(() => mod.ReactQueryDevtools);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Panel) return null;
  return <Panel buttonPosition="bottom-left" />;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_MS,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* <ReactQueryDevtoolsLazy /> */}
    </QueryClientProvider>
  );
}
