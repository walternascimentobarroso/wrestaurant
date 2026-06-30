# Fase 3 — Financeiro + IndexedDB

## Prompt para o agente

```
Implemente a Fase 3 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-2-admin-crud.md (deve estar concluída)
- docs/offline-first/phase-3-financeiro.md (este arquivo)
- frontend/AGENTS.md

1. Crie adapter IndexedDB em frontend/src/lib/offline/indexedDbPersistence.ts
2. Migre para offline-first (com IndexedDB para volumes maiores):
   - salesStorage.ts
   - payableStorage.ts
   - supplierStorage.ts
   - purchaseStorage.ts
3. Vendas são append-only (só create via pagamento de mesa + leitura)
4. Registre sync handlers

make frontend-lint ao final.
```

## Pré-requisitos

- Fases 0, 1, 2 concluídas
- Fluxo de pagamento de mesa (fase 1) gera venda — garantir que enqueue de venda está coberto

## Objetivo

Módulos financeiros operam offline. Migrar persistência de alto volume para IndexedDB mantendo a interface `PersistenceAdapter`.

## Arquivos a CRIAR

### `frontend/src/lib/offline/indexedDbPersistence.ts`

Implementar `PersistenceAdapter`:

- DB name: `restaurant-offline`
- Store: `kv` (key-value) ou uma object store por entidade
- Métodos async: `get`, `set`, `remove`, `keys`
- Exportar `indexedDbPersistence`

### `frontend/src/lib/offline/createOfflineStore.ts` (ajuste)

Se ainda síncrono apenas:

- Suportar `persistence` async OU criar `createAsyncOfflineStore` 
- Alternativa pragmática: manter store síncrono em memória + persistência async debounced (500ms) para IndexedDB

Documentar abordagem escolhida no código.

## Arquivos a MODIFICAR

### `frontend/src/features/sales/services/salesStorage.ts`

- `createOfflineStore` com `indexedDbPersistence`
- **Somente leitura + append** — vendas criadas via:
  - Handler de `payment` em tableStorage (fase 1) deve também `salesStore.mutate(append)`
  - OU enqueue separado `sales/create` com payload da venda
- `fetchSnapshot` / hydrate: `GET /sales`
- Sem update/delete de vendas

### `frontend/src/features/payables/services/payableStorage.ts`

CRUD offline completo:

| Função | Sync API |
|--------|----------|
| `createPayableApi` | `POST /payables` |
| `updatePayableApi` | `PATCH /payables/{id}` |
| `deletePayableApi` | `DELETE /payables/{id}` |
| `markPaidApi` | `POST /payables/{id}/mark-paid` |
| `markPendingApi` | `POST /payables/{id}/mark-pending` |

### `frontend/src/features/suppliers/services/supplierStorage.ts`

CRUD offline:

| Função | Sync API |
|--------|----------|
| `createSupplierApi` | `POST /suppliers` |
| `updateSupplierApi` | `PATCH /suppliers/{id}` |
| `deleteSupplierApi` | `DELETE /suppliers/{id}` |

### `frontend/src/features/purchases/services/purchaseStorage.ts`

- `recordPurchaseApi` → mutate local + enqueue
- Sync: `POST /purchases`
- Atualizar estoque local de produtos se `purchaseService` fizer isso hoje

### `frontend/src/features/purchases/services/purchaseService.ts`

Verificar se chama `recordPurchaseApi` — deve continuar funcionando sem mudança de interface.

### `frontend/src/features/suppliers/services/supplierService.ts`

Usa `getPayablesSnapshot` — ambos devem ser cache local.

### `frontend/src/features/tables/services/tableStorage.ts`

Garantir que `receivePaymentApi` local também appende em `salesStorage` (coordenação entre stores).

### `frontend/src/features/sync/services/syncService.ts`

Handlers: `sales`, `payables`, `suppliers`, `purchases`

Hydrate:

```typescript
hydrateFromServer("sales", () => apiFetch("/sales")),
hydrateFromServer("payables", () => apiFetch("/payables")),
hydrateFromServer("suppliers", () => apiFetch("/suppliers")),
hydrateFromServer("purchases", () => apiFetch("/purchases")),
```

## Arquivos que NÃO TOCAR

- `stockStorage.ts`, `checklistStorage.ts` — fase 4
- `backend/` — REST existente (batch sync é fase 5)

## Critérios de aceite

- [ ] IndexedDB persiste vendas/payables após refresh
- [ ] Pagamento de mesa offline cria venda no cache local
- [ ] CRUD payables e suppliers offline
- [ ] Registrar compra offline
- [ ] Sync drena sem duplicar vendas (idempotency via `mutation.id`)
- [ ] `useSales`, `usePayables`, `useSuppliers`, `usePurchases` sem mudança de interface
- [ ] `make frontend-lint` passa

## Teste manual

1. Offline: pagar mesa → venda aparece em relatório de vendas
2. Offline: criar payable, supplier, purchase
3. Refresh — IndexedDB mantém dados (DevTools → Application → IndexedDB)
4. Online — sync; verificar tabelas `sales`, `payables`, etc. no PostgreSQL

## Estimativa

2 semanas.
