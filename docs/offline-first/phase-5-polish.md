# Fase 5 — Polish, Backend Sync e PWA

## Prompt para o agente

```
Implemente a Fase 5 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-4-operacional.md (todas as fases anteriores concluídas)
- docs/offline-first/phase-5-polish.md (este arquivo)
- frontend/AGENTS.md
- backend/app/ — para migrations e novos endpoints

Entregas:
1. UI completa de status de sync + tela de erros/retry
2. Endpoints de sync no backend (snapshot + delta) — opcional mas recomendado
3. updated_at nos models principais
4. PWA básico (manifest + service worker para assets)
5. Deprecar apiStore.ts se não houver mais usos
6. Testes manuais documentados

make frontend-lint + verificar backend Ruff-clean.
```

## Pré-requisitos

- Fases 0–4 concluídas
- Todos os `*Storage.ts` migrados para offline

## Objetivo

Produção-ready: observabilidade de sync, sync incremental eficiente, PWA instalável, limpeza de código legado.

## Parte A — Frontend UI

### Arquivos a MODIFICAR/CRIAR

#### `frontend/src/features/sync/components/SyncStatusBadge.tsx`

Estados:

| Estado | Visual |
|--------|--------|
| Online + fila vazia | Verde "Sincronizado" |
| Online + N pendentes | Amarelo "N pendentes" |
| Offline | Cinza "Offline" |
| Erros na fila | Vermelho "Erro de sync" — click abre dialog |

#### `frontend/src/features/sync/components/SyncErrorsDialog.tsx` (CRIAR)

- Lista mutations com `lastError`
- Botão "Tentar novamente" por item e "Tentar todos"
- Botão "Descartar" (remove da fila — com confirmação)

#### `frontend/src/features/sync/hooks/useSyncStatus.ts`

Expandir: `{ online, pendingCount, errorCount, errors, retry, retryAll }`

#### `frontend/src/app/layout.tsx`

Posicionar badge de forma visível mas não intrusiva.

### PWA

#### `frontend/public/manifest.json` (CRIAR)

- `name`, `short_name`, `start_url`, `display: standalone`
- Ícones — usar existentes em `public/` ou placeholder

#### `frontend/src/app/layout.tsx`

- `<link rel="manifest" href="/manifest.json" />`

#### Service Worker

Opção mínima: `next.config` com PWA plugin **ou** SW manual em `public/sw.js` que cacheia assets estáticos apenas (não cachear `/api`).

**Não cachear API** — sync engine cuida dos dados.

## Parte B — Backend sync (recomendado)

### Arquivos a CRIAR no backend

#### `backend/app/api/routes/sync.py`

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/sync/snapshot` | JSON com todas entidades (ou lista de endpoints) |
| `GET /api/sync/delta?since=ISO8601` | Registros com `updated_at > since` |
| `POST /api/sync/push` | Batch de mutations (opcional — simplifica engine) |

#### `backend/app/schemas/sync.py`

Schemas Pydantic para push/delta.

### Arquivos a MODIFICAR no backend

Adicionar `updated_at` (e opcionalmente `deleted_at`) em models:

| Model | Arquivo |
|-------|---------|
| `RestaurantTable`, `TableOrderItem` | `models/table.py` |
| `Product` | `models/product.py` |
| `Sale` | `models/sale.py` |
| `Payable` | `models/payable.py` |
| `Supplier` | `models/supplier.py` |
| `Purchase` | `models/purchase.py` |
| `StockMovement` | `models/stock.py` |
| Checklists | `models/checklist.py` |
| Settings | `models/settings.py` |

**Migration:** criar script Alembic ou SQL manual conforme padrão do projeto.

#### `backend/app/main.py`

Registrar router `sync`.

### Arquivos a MODIFICAR no frontend

#### `frontend/src/features/sync/services/syncService.ts`

- `hydrateAll()` usar `GET /api/sync/snapshot` se disponível
- Background: poll `GET /api/sync/delta?since=cursor` a cada 60s quando online
- `syncEngine` pode usar `POST /api/sync/push` em vez de N requests

#### `frontend/src/lib/offline/syncEngine.ts`

Suportar batch push se implementado.

## Parte C — Limpeza

### `frontend/src/lib/apiStore.ts`

- Grep por `createApiStore` — deve retornar 0 usos
- Se zero: marcar `@deprecated` ou remover
- Atualizar `docs/offline-first/README.md` status

### Seeds legados

Arquivos em `frontend/public/scripts/seed-*.js` usam localStorage direto — avaliar:

- Remover se obsoletos
- OU documentar que são só para dev/demo

## Critérios de aceite

- [ ] Badge de sync reflete estado real
- [ ] Dialog de erros permite retry e descarte
- [ ] PWA instalável no Chrome (manifest válido)
- [ ] `GET /api/sync/delta` retorna dados incrementais
- [ ] `updated_at` preenchido em mutações backend
- [ ] `createApiStore` sem usos no codebase
- [ ] `make frontend-lint` passa
- [ ] Backend Ruff-clean

## Teste manual completo (checklist)

```
[ ] Boot offline (sem rede nunca conectou) — app vazio mas funcional
[ ] Boot online — hydrate completo
[ ] Operações em todas as áreas offline
[ ] Refresh — dados persistem
[ ] Reconexão — fila drena < 30s
[ ] Conflito simulado — erro visível na UI
[ ] Instalar PWA — abre standalone
[ ] Segundo dispositivo — delta pull atualiza cache (se aplicável)
```

## Estimativa

1 semana (frontend polish) + 1 semana (backend sync) — podem ser paralelizadas por dois agentes:

| Sub-fase | Arquivo foco | Agente |
|----------|--------------|--------|
| 5A | `features/sync/*`, PWA | Frontend |
| 5B | `backend/app/api/routes/sync.py`, models | Backend |

### Prompt agente 5B (backend)

```
Implemente apenas a Parte B da Fase 5 em docs/offline-first/phase-5-polish.md.
Adicione updated_at aos models, crie /api/sync/snapshot e /api/sync/delta.
Python Ruff-clean. Não altere frontend.
```

## Pós-conclusão

Atualizar `docs/offline-first/README.md` com status ✅ em todas as fases e arquitetura final.
