"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        offset={{ top: "5rem" }}
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              "!bg-surface !text-foreground !border !border-border !rounded-2xl !shadow-2xl !font-body italic",
            title: "!font-display !text-base",
            description: "!text-muted",
            success: "!border-gold/40",
            error: "!border-rust/50",
            actionButton:
              "!bg-bordeaux !text-cream !rounded-full !font-display italic",
          },
        }}
      />
    </QueryClientProvider>
  );
}
