"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type React from "react";
import { useState } from "react";
import { Toaster } from "sonner";
import { LanguageProvider } from "../lib/i18n/context";

export function Providers({
  children,
  initialLanguage = "fr",
}: {
  children: React.ReactNode;
  initialLanguage?: "en" | "fr";
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </NuqsAdapter>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
