import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/features/settings/components/SettingsProvider";
import { SyncProvider } from "@/features/sync/components/SyncProvider";
import { brand } from "@/design-system";
import { fraunces, manrope } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: `${brand} — Mesas`,
  description: `Sistema de gestão de mesas do ${brand}`,
  manifest: "/manifest.json",
  icons: {
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: brand,
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${manrope.variable} h-full w-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full w-full flex-col font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SettingsProvider>
            <SyncProvider>{children}</SyncProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
