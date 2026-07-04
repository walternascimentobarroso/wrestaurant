"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  FileUp,
  FolderTree,
  History,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  LogOut,
  Loader2,
  Menu,
  Package,
  Receipt,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncStatusBadge } from "@/features/sync/components/SyncStatusBadge";
import { brand } from "@/design-system";
import { processQueue } from "@/lib/offline";
import { cn } from "@/lib/utils";

import { useAdminAuth } from "../hooks/useAdminAuth";
import { verifyAdminSession } from "../services/adminAuth";

const AdminPasswordDialog = dynamic(
  () =>
    import("./AdminPasswordDialog").then((module) => ({
      default: module.AdminPasswordDialog,
    })),
  { ssr: false },
);

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Warehouse },
  { href: "/admin/compras", label: "Compras", icon: History },
  { href: "/admin/fornecedores", label: "Fornecedores", icon: Building2 },
  { href: "/admin/notas-fiscais", label: "Notas fiscais", icon: FileText },
  { href: "/admin/notas-fiscais/importar", label: "Importar NF", icon: FileUp },
  { href: "/admin/contas-a-pagar", label: "Contas a pagar", icon: Receipt },
  { href: "/admin/checklists", label: "Checklists", icon: ListChecks },
  { href: "/admin/relatorios", label: "Relatórios", icon: ClipboardList },
] as const;

function getAdminPageTitle(pathname: string): string {
  const match = [...ADMIN_NAV_ITEMS]
    .sort((left, right) => right.href.length - left.href.length)
    .find(({ href, ...item }) =>
      "exact" in item && item.exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    );

  return match?.label ?? "Administração";
}

interface AdminSidebarPanelProps {
  onNavigate?: () => void;
}

function AdminSidebarPanel({ onNavigate }: AdminSidebarPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <>
      <div className="border-b border-border px-4 py-4">
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground">
          {brand}
        </p>
        <h1 className="font-heading text-lg font-bold text-foreground">
          Administração
        </h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon, ...item }) => {
          const isActive =
            "exact" in item && item.exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
        <Link
          href="/"
          onClick={onNavigate}
          className="block rounded-xl px-3 py-2 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar ao salão
        </Link>
      </div>
    </>
  );
}

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, login } = useAdminAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(() => !isAuthenticated);

  useEffect(() => {
    let cancelled = false;

    async function verifySession(): Promise<void> {
      if (!isAuthenticated) {
        if (!cancelled) {
          setSessionChecked(true);
        }
        return;
      }

      await verifyAdminSession();
      if (!cancelled) {
        setSessionChecked(true);
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible" && isAuthenticated) {
        void verifyAdminSession();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated]);

  function handleLoginSuccess(): void {
    void processQueue();
    router.refresh();
  }

  if (!sessionChecked && isAuthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <SyncStatusBadge />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground">
            {brand}
          </p>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Área administrativa
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe a senha para continuar.
          </p>
        </div>

        <AdminPasswordDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              router.push("/");
            }
          }}
          onLogin={login}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  const pageTitle = getAdminPageTitle(pathname);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="relative z-[60] flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 shadow-elevated">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setNavOpen((open) => !open)}
        >
          <Menu className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold text-foreground">
            {pageTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground">{brand}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SyncStatusBadge />
          <ThemeToggle />
        </div>
      </header>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-56 max-w-[85vw] p-0" showCloseButton>
          <div className="flex h-full flex-col">
            <AdminSidebarPanel onNavigate={() => setNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
