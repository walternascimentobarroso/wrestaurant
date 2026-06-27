# Frontend Expert — Referência de Padrões

Padrões detalhados para o projeto Restaurant. Consultar quando implementar features novas ou refatorar código existente.

---

## Template: Service de API

```tsx
// features/orders/services/orderService.ts
import type { Order, CreateOrderInput } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function getOrders(): Promise<Order[]> {
  const response = await fetch(`${API_URL}/api/orders`, {
    next: { revalidate: 30 },
  });
  return handleResponse<Order[]>(response);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  return handleResponse<Order>(response);
}
```

Extrair `handleResponse` para `lib/api.ts` quando houver 3+ services repetindo o padrão.

---

## Template: Types por feature

```tsx
// features/orders/types.ts
export interface Order {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
}

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered";

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  tableNumber: number;
  items: Array<{ menuItemId: string; quantity: number }>;
}
```

---

## Template: Hook + Component (Client)

```tsx
// features/orders/hooks/useCreateOrder.ts
"use client";

import { useState, useCallback } from "react";
import { createOrder } from "../services/orderService";
import type { CreateOrderInput, Order } from "../types";

export function useCreateOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: CreateOrderInput): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await createOrder(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar pedido");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { submit, isLoading, error };
}
```

```tsx
// features/orders/components/CreateOrderForm.tsx
"use client";

import { useCreateOrder } from "../hooks/useCreateOrder";

export function CreateOrderForm() {
  const { submit, isLoading, error } = useCreateOrder();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await submit({
      tableNumber: Number(form.get("tableNumber")),
      items: [], // montar conforme UI
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {/* campos */}
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {isLoading ? "Salvando…" : "Criar pedido"}
      </button>
    </form>
  );
}
```

---

## Template: Página Server Component

```tsx
// app/orders/page.tsx
import { getOrders } from "@/features/orders/services/orderService";
import { OrderList } from "@/features/orders/components/OrderList";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-zinc-900">Pedidos</h1>
      <OrderList orders={orders} />
    </div>
  );
}
```

---

## Template: Componente de apresentação (dumb)

```tsx
// features/orders/components/OrderCard.tsx
import type { Order } from "../types";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <span className="font-medium text-zinc-900">Mesa {order.tableNumber}</span>
        <span className="text-sm text-zinc-500">{order.status}</span>
      </header>
      <ul className="mt-3 space-y-1 text-sm text-zinc-600">
        {order.items.map((item) => (
          <li key={item.menuItemId}>
            {item.quantity}x {item.name}
          </li>
        ))}
      </ul>
    </article>
  );
}
```

---

## Template: lib/utils.ts (quando necessário)

```tsx
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Instalar `clsx` e `tailwind-merge` apenas quando o projeto precisar de merge condicional frequente.

---

## Route groups e layouts

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx          # layout sem navbar
├── (dashboard)/
│   ├── orders/page.tsx
│   ├── menu/page.tsx
│   └── layout.tsx          # layout com sidebar
└── layout.tsx              # root layout (fontes, metadata)
```

Route groups `(nome)` não afetam a URL — servem para organizar layouts compartilhados.

---

## Metadata e SEO

```tsx
// app/orders/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos | Restaurant",
  description: "Gestão de pedidos do restaurante",
};
```

---

## Loading e Error boundaries

```
app/orders/
├── page.tsx
├── loading.tsx     # Suspense fallback automático
└── error.tsx       # Error boundary (deve ser Client Component)
```

```tsx
// app/orders/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-zinc-500">Carregando pedidos…</p>
    </div>
  );
}
```

```tsx
// app/orders/error.tsx
"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrdersError({ error, reset }: ErrorProps) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-red-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
```

---

## Decisões de cache (fetch)

| Cenário | Opção |
|---------|-------|
| Dados que mudam raramente (cardápio) | `next: { revalidate: 300 }` |
| Dados em tempo quase real (pedidos ativos) | `cache: 'no-store'` |
| Health check / status | `next: { revalidate: 0 }` |
| Mutação (POST/PUT/DELETE) | `cache: 'no-store'` + revalidar rota se necessário |

---

## Adicionar shadcn/ui (futuro)

Quando o projeto adotar shadcn/ui:

1. Rodar init dentro do container: `make frontend-bash` → `npx shadcn@latest init`
2. Componentes em `src/components/ui/`
3. Compor — não editar internals dos componentes gerados
4. Usar `cn()` de `lib/utils.ts`

---

## Anti-padrões (evitar)

| Anti-padrão | Alternativa |
|-------------|-------------|
| `fetch` direto no JSX | Service + tipagem |
| `'use client'` na page inteira | Extrair interatividade para subcomponente |
| `any` nas respostas da API | `interface` por endpoint |
| Estado global prematuro | Props + hooks locais; Context só quando 3+ níveis de prop drilling |
| `@tailwind base` (v3) | `@import "tailwindcss"` (v4) |
| Instalar lib sem necessidade | Usar APIs nativas (fetch, useState) primeiro |
| Lógica de negócio no componente | Hook ou service |

---

## Integração backend — convenções

O backend FastAPI expõe rotas com prefixo `/api`:

```
GET  /api/health     → { status: "ok" }
GET  /api/...        → recursos futuros
```

CORS configurado para `http://localhost:3000`. Em produção, atualizar `CORS_ORIGINS` no backend e `NEXT_PUBLIC_API_URL` no frontend.

Ao criar novo endpoint no backend, criar o service correspondente no frontend na mesma PR ou imediatamente após — manter contratos sincronizados.
