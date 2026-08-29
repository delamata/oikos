"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { DataProvider } from "@/lib/data/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "#15181c",
              border: "1px solid #232830",
              color: "#e6e9ed",
            },
          }}
        />
      </AuthProvider>
    </DataProvider>
  );
}
