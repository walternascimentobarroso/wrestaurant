# Fase 0 — Infraestrutura Offline

## Prompt para o agente

```
Implemente a Fase 0 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-0-infra.md (este arquivo)
- frontend/AGENTS.md
- .cursor/skills/frontend-expert/SKILL.md

Crie a infraestrutura em frontend/src/lib/offline/ e frontend/src/features/sync/.
NÃO migre nenhum *Storage.ts ainda. NÃO altere hooks de domínio.
Ao final: make frontend-lint deve passar.
```

## Pré-requisitos

Nenhum.

## Objetivo

Criar a base reutilizável: persistência local, store reativo (`useSyncExternalStore`), fila de sync (outbox) e engine que processa a fila contra a API REST existente.

## Arquivos a CRIAR

### `frontend/src/lib/offline/types.ts`

Tipos compartilhados:

- `SyncStatus`: `"synced" | "pending" | "error"`
- `SyncMeta`: `{ updatedAt: string; syncStatus: SyncStatus; version: number }`
- `SyncMutation`: `{ id, entity, operation, entityId, payload, createdAt, retries, lastError? }`
- `SyncEntity`: union dos domínios (`"tables" | "products" | "settings" | ...`)
- `OfflineStoreOptions<T>`: opções do factory
- `PersistenceAdapter`: interface `{ get, set, remove, keys }`

### `frontend/src/lib/offline/idGenerator.ts`

- `generateMutationId(): string` — `crypto.randomUUID()`
- `generateTempId(): string` — prefixo `tmp_` para entidades criadas offline
- `isTempId(id: string | number): boolean`

### `frontend/src/lib/offline/connectivity.ts`

- `isOnline(): boolean` — `navigator.onLine`
- `subscribeConnectivity(listener): () => void` — eventos `online`/`offline`
- `checkApiHealth(): Promise<boolean>` — usa `getApiHealth()` de `@/lib/api`

### `frontend/src/lib/offline/localPersistence.ts`

Adapter de `localStorage`:

- Prefixo de chaves: `restaurant:v1:`
- `getItem<T>(key): T | null`
- `setItem<T>(key, value): void`
- `removeItem(key): void`
- Try/catch em JSON.parse — retornar `null` se corrompido
- Exportar instância default `localPersistence`

### `frontend/src/lib/offline/createOfflineStore.ts`

Factory inspirado em `createApiStore` (`frontend/src/lib/apiStore.ts`):

```typescript
createOfflineStore<T>({
  key: string,              // chave localStorage
  serverSnapshot: T,
  eventName: string,
  persistence?: PersistenceAdapter,
})
```

Retorna:

| Método | Comportamento |
|--------|---------------|
| `subscribe` | Registra listener + carrega do localStorage no primeiro subscribe |
| `getSnapshot` | Retorna cache em memória |
| `getServerSnapshot` | Retorna `serverSnapshot` (SSR) |
| `mutate(updater: (prev: T) => T)` | Atualiza memória + persiste + `emit` |
| `replace(data: T)` | Substitui estado inteiro (hydrate do servidor) |
| `isLoaded` | `boolean` |
| `getError` | `unknown \| null` |

**Regra:** `mutate` deve ser síncrono e instantâneo.

### `frontend/src/lib/offline/syncQueue.ts`

Fila persistente em `restaurant:v1:sync-queue`:

- `enqueue(mutation: Omit<SyncMutation, "id" | "createdAt" | "retries">): SyncMutation`
- `peek(): SyncMutation | null`
- `dequeue(id: string): void`
- `getAll(): SyncMutation[]`
- `getPendingCount(): number`
- `markRetry(id, error): void`
- `subscribe(listener): () => void` — para UI de status
- `getSnapshot / getServerSnapshot` — compatível com `useSyncExternalStore`

### `frontend/src/lib/offline/syncEngine.ts`

Processador da fila:

- `startSyncEngine(): () => void` — inicia listeners (online, visibilitychange)
- `processQueue(): Promise<void>` — processa FIFO com mutex (não paralelizar)
- `registerHandler(entity, handler)` — mapa entity → função que chama API
- Backoff: `[1000, 3000, 10000, 30000]` ms entre retries
- Máximo 10 retries por mutation; depois marca `error` permanente
- Em sucesso: `dequeue`
- Exportar `syncEngine` singleton com `registerHandler`, `start`, `stop`, `flush`

**Importante:** handlers são registrados nas fases 1+; na fase 0 o engine existe mas a fila pode estar vazia.

### `frontend/src/lib/offline/index.ts`

Re-export público de todos os módulos acima.

### `frontend/src/features/sync/services/syncService.ts`

Orquestração de alto nível:

- `initSync(): () => void` — chama `startSyncEngine()`, registra handlers vazios ou stub
- `getSyncStatus(): { online, pending, errors }`
- `retryFailed(): void` — reseta retries e dispara `processQueue`
- `hydrateFromServer(entity, fetcher): Promise<void>` — pull inicial (usado nas fases 1+)

### `frontend/src/features/sync/hooks/useSyncStatus.ts`

Hook client:

- `useSyncStatus()` → `{ online, pendingCount, hasErrors, retry }`
- Usa `useSyncExternalStore` para fila + connectivity

### `frontend/src/features/sync/components/SyncStatusBadge.tsx`

Componente mínimo (pode ser placeholder na fase 0):

- Ícone/texto: Online + pendente / Offline / Erro
- `'use client'`

### `frontend/src/features/sync/index.ts`

Exports públicos.

## Arquivos a MODIFICAR

### `frontend/src/app/layout.tsx`

- Importar e chamar `initSync()` em um client wrapper OU criar `SyncProvider` que chama `initSync()` no `useEffect`
- Renderizar `<SyncStatusBadge />` (canto discreto, ex. footer ou header)

**Opção recomendada:** criar `frontend/src/features/sync/components/SyncProvider.tsx` (`'use client'`) que encapsula init + badge.

## Arquivos que NÃO TOCAR

- `frontend/src/features/*/services/*Storage.ts` (exceto nenhum na fase 0)
- `frontend/src/lib/apiStore.ts` — manter até migração gradual
- `backend/` — sem mudanças na fase 0
- Hooks de domínio

## Critérios de aceite

- [ ] `createOfflineStore` persiste e re-hidrata do localStorage após refresh
- [ ] `mutate` dispara re-render via `useSyncExternalStore`
- [ ] `syncQueue` persiste mutations entre refreshes
- [ ] `syncEngine` não processa quando offline
- [ ] `syncEngine` retoma quando `online` dispara
- [ ] `SyncStatusBadge` visível no layout
- [ ] `make frontend-lint` passa
- [ ] TypeScript strict — sem `any`

## Teste manual

1. No DevTools Console:
   ```javascript
   // Verificar store
   localStorage.setItem('restaurant:v1:test', JSON.stringify([1,2,3]))
   ```
2. Recarregar página — app não quebra
3. Desligar backend (`make stop`) — app carrega normalmente
4. Badge mostra "Offline" ou equivalente

## Estimativa

1–2 dias de implementação.
