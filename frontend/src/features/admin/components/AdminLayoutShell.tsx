"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Package,
  Warehouse,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { brand } from "@/design-system";
import { cn } from "@/lib/utils";

import { AdminPasswordDialog } from "./AdminPasswordDialog";
import { useAdminAuth } from "../hooks/useAdminAuth";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Warehouse },
  { href: "/admin/relatorios", label: "Relatórios", icon: ClipboardList },
] as const;

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, login, logout } = useAdminAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary">
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
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card shadow-elevated">
        <div className="border-b border-border px-4 py-4">
          <p className="font-heading text-xs font-semibold uppercase tracking-wide text-primary">
            {brand}
          </p>
          <h1 className="font-heading text-lg font-bold text-foreground">Administração</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon, ...item }) => {
            const isActive =
              "exact" in item && item.exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
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
            className="block rounded-xl px-3 py-2 text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar ao salão
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
