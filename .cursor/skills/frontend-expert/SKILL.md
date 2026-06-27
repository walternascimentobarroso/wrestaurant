---
name: frontend-expert
description: >-
  Especialista em frontend do projeto Restaurant. Guia desenvolvimento em
  Next.js 16, React 19, TypeScript e Tailwind CSS 4 integrado ao backend FastAPI.
  Use ao criar ou refatorar componentes, páginas, hooks, serviços de API, estilos,
  arquitetura de features, ou ao trabalhar em frontend/, make frontend-* ou
  integração com NEXT_PUBLIC_API_URL.
---

# Frontend Expert — Restaurant

Especialista no frontend do monorepo Restaurant: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Docker Compose + FastAPI.

## Quando aplicar

- Criar ou editar arquivos em `frontend/`
- Componentes, páginas, layouts, hooks, serviços de API
- Integração com backend FastAPI (`/api/*`)
- Estilização com Tailwind 4
- Arquitetura de features (pedidos, cardápio, mesas, etc.)
- Lint, build ou debug via Docker (`make frontend-*`)

## Regra crítica — Next.js 16

**Antes de escrever código Next.js**, leia `frontend/AGENTS.md` e, se necessário, a documentação em `frontend/node_modules/next/dist/docs/`. A versão 16 tem breaking changes em relação a versões anteriores — não assuma APIs de memória.

## Workflow de análise

Antes de implementar, inspecione nesta ordem:

```
Análise do frontend:
- [ ] frontend/package.json — versões e scripts
- [ ] frontend/src/ — estrutura atual (app/, lib/, features/)
- [ ] frontend/AGENTS.md — regras do Next.js 16
- [ ] frontend/src/lib/api.ts — padrão de chamadas à API
- [ ] backend/app/api/routes/ — endpoints disponíveis
- [ ] .env.example — NEXT_PUBLIC_API_URL, FRONTEND_PORT
- [ ] Makefile — targets frontend-bash, frontend-lint, logs-frontend
```

## Stack do projeto

| Tecnologia | Versão | Notas |
|------------|--------|-------|
| Next.js | 16.x | App Router, Server Components por padrão |
| React | 19.x | Sem forwardRef obrigatório em muitos casos |
| TypeScript | 5.x | `strict: true`, alias `@/*` → `./src/*` |
| Tailwind CSS | 4.x | `@import "tailwindcss"`, `@theme inline` |
| ESLint | 9.x | `eslint-config-next` (core-web-vitals + typescript) |
| API | FastAPI | Base: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) |

## Estrutura de pastas

Organizar por **feature de negócio**, não por tipo técnico:

```
frontend/src/
├── app/                    # Rotas Next.js (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   └── (grupos)/           # Route groups quando fizer sentido
├── features/               # Módulos de domínio (pedidos, menu, mesas…)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types.ts
│       └── index.ts        # exports públicos (opcional)
├── components/             # UI compartilhada (quando 2+ features usam)
│   └── ui/                 # shadcn/ui (quando adicionado)
└── lib/
    ├── api.ts              # cliente HTTP base + helpers globais
    └── utils.ts            # cn(), formatters, etc.
```

**Regras:**
- Componente usado em uma feature → `features/<feature>/components/`
- Só mover para `components/` após uso em 2+ features
- Páginas em `app/` são finas: fetch + composição de features
- Serviços de API por feature em `features/<feature>/services/`

## Camadas e responsabilidades

| Camada | Onde | Responsabilidade |
|--------|------|------------------|
| **Page/Layout** | `app/` | Roteamento, metadata, fetch server-side |
| **Component** | `features/*/components/` | UI pura ou composição com hooks |
| **Hook** | `features/*/hooks/` | Estado, efeitos, orquestração |
| **Service** | `features/*/services/` ou `lib/` | fetch, transformação de dados |
| **Types** | `features/*/types.ts` | Interfaces do domínio |

**Fluxo:** Page (Server) → Service → Component. Hooks só em Client Components.

## Server vs Client Components

**Padrão:** Server Component. Adicionar `'use client'` apenas quando necessário:

- `useState`, `useEffect`, `useContext`, event handlers
- APIs do browser (`localStorage`, `window`)
- Bibliotecas que dependem de hooks

```tsx
// app/page.tsx — Server Component (padrão)
import { getApiHealth } from "@/lib/api";

export default async function Home() {
  const health = await getApiHealth();
  return <StatusBadge status={health?.status} />;
}
```

```tsx
// features/shared/components/StatusBadge.tsx — Client se interativo
"use client";

interface StatusBadgeProps {
  status?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span>{status === "ok" ? "Conectado" : "Indisponível"}</span>;
}
```

## Integração com API (FastAPI)

Base URL via env — nunca hardcodar:

```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
```

**Padrão de service (Server Component friendly):**

```tsx
// features/menu/services/menuService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getMenuItems(): Promise<MenuItem[]> {
  const res = await fetch(`${API_URL}/api/menu`, {
    next: { revalidate: 60 }, // cache com revalidação
  });
  if (!res.ok) throw new Error("Falha ao carregar cardápio");
  return res.json();
}
```

**Regras:**
- Endpoints do backend usam prefixo `/api`
- Server fetch: usar `next: { revalidate: N }` ou `cache: 'no-store'` conforme necessidade
- Client fetch: preferir hooks (`useSWR`, React Query) ou `useEffect` + service
- Tratar erros explicitamente — não silenciar com `catch {}` vazio sem fallback
- Tipar respostas com `interface` — nunca `any`

## Tailwind CSS 4

O projeto usa Tailwind 4 com PostCSS. Padrões atuais em `globals.css`:

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
}
```

**Convenções:**
- Usar utilitários Tailwind diretamente nas classes
- Paleta atual: zinc (neutros), bordas `border-zinc-200`, fundos `bg-zinc-50`
- Fontes: Geist Sans/Mono via `next/font/google` no layout
- Dark mode: `prefers-color-scheme` em `:root` — manter consistência
- Quando `cn()` existir em `lib/utils.ts`, usar para merge condicional de classes

## Princípios de código

Aplicar sempre (alinhado às regras do projeto):

- **SRP:** um componente/hook = uma responsabilidade
- **KISS:** solução mais simples que funciona
- **YAGNI:** não adicionar abstrações antes de precisar
- **DRY:** extrair após segunda repetição idêntica (não antes)
- **DIP:** componentes dependem de hooks/services, não de fetch direto

## Convenções de nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente | PascalCase | `OrderCard.tsx` |
| Hook | camelCase + `use` | `useOrderList.ts` |
| Service | camelCase | `orderService.ts` |
| Tipo/Interface | PascalCase | `Order`, `MenuItem` |
| Página | `page.tsx` | `app/orders/page.tsx` |
| Layout | `layout.tsx` | `app/(dashboard)/layout.tsx` |

Props: usar `interface`, destructuring na assinatura, defaults na função.

## Desenvolvimento com Docker

Comandos via Makefile na raiz do monorepo:

| Comando | Uso |
|---------|-----|
| `make up` | Sobe frontend + backend + db |
| `make frontend-bash` | Shell no container |
| `make frontend-lint` | ESLint |
| `make logs-frontend` | Logs em tempo real |

Variáveis: `FRONTEND_PORT` (3000), `NEXT_PUBLIC_API_URL` (8000).

**Importante:** alterações em `frontend/` são montadas por volume — hot reload ativo. Não rodar `npm install` no host se o fluxo é Docker-first; usar `make frontend-bash` + `npm install` no container.

## Checklist antes de entregar

```
- [ ] Código em frontend/src/ segue estrutura feature-based
- [ ] Server/Client boundary correta ('use client' só onde necessário)
- [ ] API usa NEXT_PUBLIC_API_URL, endpoints com /api
- [ ] TypeScript strict — sem any, tipos nas respostas
- [ ] Tailwind 4 — sem @tailwind base/components/utilities (sintaxe antiga)
- [ ] ESLint limpo (make frontend-lint)
- [ ] Escopo mínimo — sem refatorar código não relacionado
- [ ] Textos/UI em português quando for interface do restaurante
```

## Padrões detalhados

Para templates de componentes, hooks, services, formulários e decisões de arquitetura, leia [reference.md](reference.md).
