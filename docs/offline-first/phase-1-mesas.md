# Fase 1 — Core Operacional (Mesas)

## Prompt para o agente

```
Implemente a Fase 1 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-0-infra.md (deve estar concluída)
- docs/offline-first/phase-1-mesas.md (este arquivo)
- frontend/AGENTS.md

Migre o fluxo de MESAS para offline-first:
- tableStorage.ts (escrita + leitura local)
- productStorage.ts (somente LEITURA local; writes ficam para fase 2)
- settingsStorage.ts (leitura + escrita local)
- menuCatalogStorage.ts (somente LEITURA local)

Registre handlers no syncEngine para cada mutation de mesa/settings.
Hooks NÃO devem mudar de interface pública.
Ao final: make frontend-lint + teste manual offline descrito abaixo.
```

## Pré-requisitos

- **Fase 0 concluída** — `frontend/src/lib/offline/` existe e funciona

## Objetivo

Fluxo de mesas (adicionar/remover item, pagamento, limpar mesa) funciona **instantaneamente offline**. Produtos e settings disponíveis localmente para a UI. Sync em background quando online.

## Arquivos a MODIFICAR

### `frontend/src/features/tables/services/tableStorage.ts`

**Substituir** `createApiStore` por `createOfflineStore`.

| Função | Comportamento novo |
|--------|-------------------|
| `subscribeTables`, `getTablesSnapshot`, etc. | Via `createOfflineStore` |
| `addTableItemApi` | `store.mutate` local + `syncQueue.enqueue` |
| `removeTableItemApi` | idem |
| `clearTableApi` | idem |
| `receivePaymentApi` | idem (limpa items localmente; enfileira payment) |
| `createTableApi` | idem — ID temporário negativo ou `tmp_` até sync |
| `updateTableApi` | idem |
| `deleteTableApi` | soft delete local ou remove + enqueue |
| `refreshTables` | Pull do servidor → `store.replace` (só quando online) |
| `persistTables` | noop ou `store.mutate` se ainda usado |

**Lógica local a implementar** (extrair em funções puras no mesmo arquivo ou `tableMutations.ts`):

- `applyAddItem(tables, tableId, productId)`
- `applyRemoveItem(tables, tableId, productId)`
- `applyClearTable(tables, tableId)`
- `applyPayment(tables, tableId)` — zera items, status FREE
- `applyCreateTable`, `applyUpdateTable`, `applyDeleteTable`
- Reutilizar `calculateTableTotal`, `countTableItems`, `sortTables`

**Sync handlers** (registrar em `initSync` ou no próprio arquivo via side-effect controlado):

| Operation | API existente |
|-----------|---------------|
| `addItem` | `POST /tables/{id}/items` |
| `removeItem` | `PATCH /tables/{id}/items/{productId}` |
| `clearTable` | `DELETE /tables/{id}/items` |
| `payment` | `POST /tables/{id}/payment` |
| `createTable` | `POST /tables` — após sucesso, mapear tempId → serverId |
| `updateTable` | `PATCH /tables/{id}` |
| `deleteTable` | `DELETE /tables/{id}` |

**Hydrate inicial:** no primeiro `subscribe`, se localStorage vazio e online → `GET /tables` → `store.replace`.

### `frontend/src/features/menu/services/productStorage.ts`

**Somente leitura offline** nesta fase:

- `createOfflineStore` para cache local
- Hydrate: `GET /products` no boot se vazio
- `createProductApi`, `updateProductApi`, `deleteProductApi` — **manter chamada API direta por agora** (fase 2 migra writes)
- OU: se produtos forem necessários offline no admin, pelo menos garantir que `getProductsSnapshot` nunca bloqueia em rede

### `frontend/src/features/settings/services/settingsStorage.ts`

- `createOfflineStore` com default `{ currency: "EUR" }`
- `persistCurrency` → `store.mutate` local + enqueue `PATCH /settings`
- Hydrate: `GET /settings` se vazio

### `frontend/src/features/menu/services/menuCatalogStorage.ts`

**Somente leitura offline:**

- `createOfflineStore`
- Hydrate: `GET /menu/categories`
- Funções utilitárias (`getSubcategoryNames`, etc.) — sem mudança
- Writes de categorias — **fase 2**

### `frontend/src/features/sync/services/syncService.ts`

Registrar handlers reais para:

- `tables` — todas as operations da tabela acima
- `settings` — `updateCurrency`

Adicionar `hydrateAll()` chamado no boot:

```typescript
await Promise.all([
  hydrateFromServer("tables", () => apiFetch("/tables")),
  hydrateFromServer("products", () => apiFetch("/products")),
  hydrateFromServer("settings", () => apiFetch("/settings")),
  hydrateFromServer("menu", () => apiFetch("/menu/categories")),
]);
```

Só hidrata se localStorage da entidade estiver vazio **ou** se explicitamente online e `force` (opcional).

## Arquivos a CRIAR (opcional, se extrair lógica)

### `frontend/src/features/tables/services/tableMutations.ts`

Funções puras de mutação local — facilita testes e mantém `tableStorage.ts` enxuto.

## Arquivos que NÃO TOCAR

- `frontend/src/features/tables/hooks/useTableStore.ts` — interface igual
- `frontend/src/features/tables/hooks/useTableAdmin.ts` — interface igual (admin CRUD de mesa usa APIs que agora são offline na storage)
- `frontend/src/features/tables/components/*`
- `backend/` — usar endpoints REST existentes
- Outros `*Storage.ts` (sales, payables, stock, etc.)

## Mapeamento tempId → serverId

Quando `createTableApi` cria mesa offline:

1. Atribuir `id: -Date.now()` ou `tmp_uuid`
2. Enfileirar mutation com tempId
3. No handler de sync: `POST /tables` → recebe `{ id: 42, ... }`
4. `store.mutate` substitui tempId por 42 em todas as referências
5. Atualizar mutations pendentes na fila que referenciam o tempId

Documentar essa lógica em comentário breve no handler.

## Critérios de aceite

- [ ] Adicionar produto na mesa: UI atualiza em < 16ms, sem await de rede
- [ ] Com backend desligado: mesas funcionam (add, remove, pagar, limpar)
- [ ] Após ligar backend: fila drena, dados aparecem no PostgreSQL
- [ ] Refresh da página: estado das mesas persiste
- [ ] Produtos e settings carregam do cache local sem rede
- [ ] `useTableStore` e `useTableAdmin` compilam sem mudanças de assinatura
- [ ] `make frontend-lint` passa

## Teste manual

1. `make up` — hidratar dados
2. Abrir app, ver mesas
3. `make stop` (só backend) ou DevTools → Offline
4. Adicionar itens, registrar pagamento
5. Recarregar — dados persistem
6. `make up` — aguardar sync (badge pendente → sincronizado)
7. `make db-shell` — verificar vendas/mesas no banco

## Estimativa

2–3 dias.
