# Offline-First — Plano por Fases

Plano dividido em arquivos para execução por agentes independentes. Cada fase é autocontida: leia o arquivo da fase, execute as tarefas listadas, valide os critérios de aceite.

## Objetivo

Tornar o app **offline-first**: leituras e escritas instantâneas via armazenamento local; sincronização com o backend FastAPI em background.

## Arquitetura final

```
UI (hooks existentes)
  → *Storage.ts (createOfflineStore)
    → localStorage (fases 1–2) / IndexedDB (fases 3+)
    → syncQueue (outbox)
      → syncEngine → apiFetch → backend
                         ↑
              GET /api/sync/snapshot | /delta (fase 5)
```

## Ordem de execução

| Fase | Arquivo | Status | Entregável principal |
|------|---------|--------|----------------------|
| 0 | [phase-0-infra.md](./phase-0-infra.md) | ✅ | `createOfflineStore`, `syncQueue`, `syncEngine` |
| 1 | [phase-1-mesas.md](./phase-1-mesas.md) | ✅ | Fluxo de mesas 100% offline |
| 2 | [phase-2-admin-crud.md](./phase-2-admin-crud.md) | ✅ | CRUD admin offline (produtos, menu, mesas) |
| 3 | [phase-3-financeiro.md](./phase-3-financeiro.md) | ✅ | Vendas, payables, suppliers, purchases + IndexedDB |
| 4 | [phase-4-operacional.md](./phase-4-operacional.md) | ✅ | Estoque e checklists offline |
| 5 | [phase-5-polish.md](./phase-5-polish.md) | ✅ | UI de sync, PWA, backend delta |

## Infra compartilhada

```
frontend/src/lib/offline/
├── types.ts
├── idGenerator.ts
├── connectivity.ts
├── localPersistence.ts
├── indexedDbPersistence.ts
├── createOfflineStore.ts
├── syncQueue.ts
├── syncEngine.ts
└── index.ts

frontend/src/features/sync/
├── components/SyncStatusBadge.tsx
├── components/SyncErrorsDialog.tsx
├── components/SyncProvider.tsx
├── hooks/useSyncStatus.ts
├── services/syncService.ts
└── services/syncHydration.ts
```

## Backend sync (fase 5)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/sync/snapshot` | Estado completo para hydrate inicial |
| `GET /api/sync/delta?since=ISO8601` | Registros com `updated_at > since` |

Models com `updated_at`: mesas, produtos, vendas, payables, suppliers, purchases, stock, checklists, settings, menu.

## Mapa de arquivos por domínio

| Domínio | Storage | Hook(s) principal(is) |
|---------|---------|------------------------|
| Mesas | `features/tables/services/tableStorage.ts` | `useTableStore`, `useTableAdmin` |
| Produtos | `features/menu/services/productStorage.ts` | `useProducts`, `useProductAdmin` |
| Menu/catálogo | `features/menu/services/menuCatalogStorage.ts` | `useMenuCatalog` |
| Settings | `features/settings/services/settingsStorage.ts` | `SettingsProvider` |
| Vendas | `features/sales/services/salesStorage.ts` | `useSales` |
| Payables | `features/payables/services/payableStorage.ts` | `usePayables` |
| Suppliers | `features/suppliers/services/supplierStorage.ts` | `useSuppliers` |
| Purchases | `features/purchases/services/purchaseStorage.ts` | `usePurchases` |
| Stock | `features/stock/services/stockStorage.ts` | `useStock` |
| Checklists | `features/checklists/services/checklistStorage.ts` | `useDailyChecklist`, `useChecklistAdmin` |

## Seeds de desenvolvimento

Scripts em `frontend/public/scripts/seed-*.js` gravam direto no `localStorage` — **somente para demo/dev**. O fluxo de produção usa hydrate via API + sync engine.

## Teste manual (checklist)

```
[ ] Boot offline (sem rede nunca conectou) — app vazio mas funcional
[ ] Boot online — hydrate completo via /api/sync/snapshot
[ ] Operações em todas as áreas offline
[ ] Refresh — dados persistem
[ ] Reconexão — fila drena < 30s
[ ] Conflito simulado — erro visível na UI (badge vermelho + dialog)
[ ] Instalar PWA — abre standalone (Chrome → Instalar app)
[ ] Segundo dispositivo — delta pull atualiza cache após 60s
```

## Legado removido

- `createApiStore` / `apiStore.ts` — substituído por `createOfflineStore` em todos os módulos.
