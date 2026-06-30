# Fase 4 — Estoque e Checklists

## Prompt para o agente

```
Implemente a Fase 4 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-3-financeiro.md (deve estar concluída)
- docs/offline-first/phase-4-operacional.md (este arquivo)
- frontend/AGENTS.md

Migre para offline-first:
- stockStorage.ts
- checklistStorage.ts

Replique validações de estoque localmente (espelho das regras do backend).
Registre sync handlers.

make frontend-lint ao final.
```

## Pré-requisitos

- Fases 0–3 concluídas
- Produtos com `track_stock`, `stock_quantity` em cache local (fase 2)

## Objetivo

Ajustes de estoque e checklists diários funcionam offline. Validação de estoque ao adicionar item na mesa funciona sem rede.

## Arquivos a MODIFICAR

### `frontend/src/features/stock/services/stockStorage.ts`

- `createOfflineStore` + IndexedDB (movimentos podem crescer)
- `adjustStockApi` → mutate local + enqueue
- Sync: `POST /stock/adjustments`
- Hydrate: `GET /stock/movements`
- Helpers existentes: `filterMovementsByProduct`, etc. — manter

### `frontend/src/features/stock/services/stockService.ts`

Hoje importa de `productStorage` e `stockStorage`.

- Garantir que `deductStockForOrder` / validações usem cache local
- Após adjust offline: atualizar `stock_quantity` no productStorage local

### `frontend/src/features/tables/services/tableStorage.ts`

- `addTableItemApi` deve chamar validação de estoque local antes de mutate
- Importar de `stockService` ou util local

### `frontend/src/features/checklists/services/checklistStorage.ts`

Store composto (`ChecklistStore` com templates, items, completions):

| Função | Sync API |
|--------|----------|
| `toggleCompletion` | `POST /checklists/completions/toggle` |
| `createItemApi` | `POST /checklists/items` |
| `updateItemApi` | `PATCH /checklists/items/{id}` |
| `deleteItemApi` | `DELETE /checklists/items/{id}` |
| `updateTemplateApi` | `PATCH /checklists/templates/{id}` |
| `moveItemApi` | `POST /checklists/items/{id}/move` |
| `fetchDailyChecklist` | Cache local por `dateKey`; hydrate `GET /checklists/daily?date=` |

Persistência: localStorage ok (volume baixo) ou IndexedDB — decisão do agente.

### `frontend/src/features/sync/services/syncService.ts`

Handlers: `stock`, `checklists`

## Arquivos a CRIAR

### `frontend/src/features/stock/utils/stockValidation.ts`

Réplica local das regras em `backend/app/services/stock_service.py`:

- `canAddProductToOrder(product, currentQty, productsMap)`
- `validateOrderStock(...)`
- `deductStockLocally(products, items)`

Ler o backend e espelhar lógica — não inventar regras diferentes.

**Arquivo de referência backend:** `backend/app/services/stock_service.py`

## Arquivos que NÃO TOCAR

- `backend/` — fase 5 adiciona `updated_at` se necessário
- Componentes de UI de checklists/stock — só se quebrar compilação

## Reconciliação de estoque

Se servidor rejeitar adjust (ex.: quantidade negativa):

- Marcar mutation como `error` permanente
- Expor na UI de sync (fase 5) ou log console por agora
- Opcional: pull de produtos do servidor para corrigir cache

## Critérios de aceite

- [ ] Ajuste de estoque offline persiste e sincroniza
- [ ] Adicionar item na mesa valida estoque offline (produto sem estoque → erro imediato)
- [ ] Pagamento deduz estoque localmente
- [ ] Toggle de checklist offline persiste
- [ ] CRUD de itens/templates de checklist offline
- [ ] `useStock`, `useDailyChecklist`, `useChecklistAdmin` sem mudança de interface
- [ ] `make frontend-lint` passa

## Teste manual

1. Produto com `track_stock`, quantidade 1
2. Offline: adicionar 2x na mesa — segunda deve falhar
3. Offline: ajustar estoque +10 via admin
4. Adicionar na mesa — deve funcionar
5. Offline: marcar itens do checklist
6. Online — sync; verificar backend

## Estimativa

1–2 semanas.
