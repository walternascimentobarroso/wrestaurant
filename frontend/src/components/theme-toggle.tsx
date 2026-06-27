"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) {
    return <div className="h-12 w-[6.5rem] rounded-2xl bg-muted" />;
  }

  const currentTheme = theme === "dark" ? "dark" : "light";

  return (
    <div
      className="flex rounded-2xl border border-border bg-card p-1 shadow-elevated"
      role="group"
      aria-label="Tema da interface"
    >
      <Button
        type="button"
        variant={currentTheme === "light" ? "default" : "ghost"}
        size="icon-lg"
        className={cn(
          "size-12 rounded-xl",
          currentTheme === "light" && "shadow-elevated",
        )}
        onClick={() => setTheme("light")}
        aria-label="Tema claro"
        aria-pressed={currentTheme === "light"}
      >
        <Sun className="size-5" />
      </Button>
      <Button
        type="button"
        variant={currentTheme === "dark" ? "default" : "ghost"}
        size="icon-lg"
        className={cn(
          "size-12 rounded-xl",
          currentTheme === "dark" && "shadow-elevated",
        )}
        onClick={() => setTheme("dark")}
        aria-label="Tema escuro"
        aria-pressed={currentTheme === "dark"}
      >
        <Moon className="size-5" />
      </Button>
    </div>
  );
}
