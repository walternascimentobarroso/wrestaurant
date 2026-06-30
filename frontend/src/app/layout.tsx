import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/features/settings/components/SettingsProvider";
import { brand } from "@/design-system";
import { fraunces, manrope } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: `${brand} — Mesas`,
  description: `Sistema de gestão de mesas do ${brand}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
