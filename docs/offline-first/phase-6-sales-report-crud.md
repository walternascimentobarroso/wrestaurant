# Fase 6 — CRUD de Vendas no Relatório Admin

## Prompt para o agente

```
Implemente a Fase 6 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-3-financeiro.md (deve estar concluída)
- docs/offline-first/phase-6-sales-report-crud.md (este arquivo)
- frontend/AGENTS.md
- AGENTS.md (backend)

Entregue CRUD de vendas na área admin de relatórios (/admin/relatorios),
offline-first, com reversão de estoque no backend.

make frontend-lint e ruff check backend/app ao final.
```

## Pré-requisitos

- Fases 0–5 concluídas
- Vendas criadas via pagamento de mesa (fase 1/3)
- Admin autenticado via JWT (`/api/auth/login`)

## Objetivo

Permitir corrigir relatórios de dias passados: adicionar venda esquecida, editar venda incorreta ou excluir venda errada — tudo offline-first, com motivo obrigatório e ajuste de estoque no servidor.

O relatório continua sendo uma **visão derivada** das vendas agrupadas por `paidAt` (dia local). Não criar entidade `DailyReport`.

## Arquitetura

```
AdminReportDetailPage
  → useSaleAdmin (hook)
    → salesStorage (createSaleApi / updateSaleApi / deleteSaleApi)
      → createOfflineStore + syncQueue
        → salesSyncHandlers → POST/PATCH/DELETE /api/sales
```

## Arquivos a CRIAR — Backend

### `backend/app/services/sale_service.py`

| Função | Responsabilidade |
|--------|------------------|
| `validate_sale_reason(reason)` | Motivo obrigatório (≥ 3 chars) |
| `build_sale_items(db, items_input)` | Resolve produtos, calcula totais |
| `create_manual_sale(db, body)` | Cria venda `source=manual`, deduz estoque |
| `update_sale(db, sale_id, body)` | Atualiza venda, reverte + reaplica estoque se itens mudarem |
| `delete_sale(db, sale_id, reason)` | Reverte estoque, remove venda |

### `backend/app/services/stock_service.py` (adição)

| Função | Responsabilidade |
|--------|------------------|
| `reverse_stock_for_sale(db, sale_id, reason)` | Compensa movimentos `type=sale` com `reference_id=sale_id` |

### Schemas em `backend/app/schemas/sale.py`

| Schema | Campos principais |
|--------|-------------------|
| `SaleItemInput` | `productId`, `quantity` |
| `SaleCreate` | `tableNumber`, `paidAt`, `items[]`, `paymentMethod`, `amountReceived`, `change`, `reason` |
| `SaleUpdate` | campos opcionais + `reason` obrigatório |

### Rotas em `backend/app/api/routes/sales.py`

| Método | Rota | Auth |
|--------|------|------|
| `POST` | `/api/sales` | `get_current_admin` |
| `PATCH` | `/api/sales/{id}` | `get_current_admin` |
| `DELETE` | `/api/sales/{id}?reason=` | `get_current_admin` |

### Model `backend/app/models/sale.py`

| Coluna | Tipo | Default |
|--------|------|---------|
| `source` | `String(16)` | `"table"` |
| `adjustment_reason` | `Text` | `NULL` |

### Migration `migrate_sale_source_columns()` em `migrations.py`

Adicionar `source` e `adjustment_reason` em DBs legados.

### `backend/app/api/routes/tables.py`

Ao criar venda via pagamento: `source="table"`.

## Arquivos a CRIAR — Frontend

### `frontend/src/features/sales/services/saleService.ts`

Validação e `buildSaleFromInput` (espelho de `payableService.ts`).

### `frontend/src/features/sales/hooks/useSaleAdmin.ts`

Hook admin com `createSale`, `updateSale`, `deleteSale` + validação.

### `frontend/src/features/sales/components/SaleFormDialog.tsx`

Formulário: mesa, data/hora, itens (produto + qtd), pagamento, motivo.

### `frontend/src/features/sales/components/DeleteSaleDialog.tsx`

Confirmação de exclusão com motivo.

## Arquivos a MODIFICAR — Frontend

### `frontend/src/features/sales/types.ts`

```typescript
source?: "table" | "manual" | "adjusted";
adjustmentReason?: string;
export interface SaleFormInput { ... }
export interface SaleActionResult { ok: true } | { ok: false; error: string }
```

### `frontend/src/features/sales/services/saleMutations.ts`

| Função | Uso |
|--------|-----|
| `applyCreateSale` | Append local |
| `applyUpdateSale` | Replace no array |
| `applyDeleteSale` | Remove do array |
| `replaceSaleId` | Já existe |

### `frontend/src/features/sales/services/salesStorage.ts`

Migrar de append-only para CRUD completo (padrão `payableStorage.ts`):

| Função | Sync |
|--------|------|
| `createSaleApi` | `POST /sales` |
| `updateSaleApi` | `PATCH /sales/{id}` |
| `deleteSaleApi` | `DELETE /sales/{id}?reason=` |

Manter `recordSale` para pagamento de mesa.

### `frontend/src/features/sales/services/salesSyncHandlers.ts`

Operações: `create`, `update`, `delete` (além do mapeamento de ID pós-pagamento).

### `frontend/src/features/sales/components/DailyReportPanel.tsx`

Props opcionais: `editable`, `onEdit`, `onDelete`.

### `frontend/src/features/admin/components/AdminReportDetailPage.tsx`

Botão "Adicionar venda", integração com dialogs, `useSaleAdmin`.

### `backend/app/services/mappers.py`

Incluir `source` e `adjustmentReason` em `sale_to_read`.

## Arquivos que NÃO TOCAR

- Fluxo operacional de mesas (`TableDetailPage`, `receivePaymentApi`) — só leitura
- Checklists de fecho — fora de escopo
- Entidade `DailyReport` — não criar

## Regras de negócio

| Regra | Onde |
|-------|------|
| Motivo obrigatório em create/update/delete | Backend + frontend |
| Create manual deduz estoque | `sale_service` + `deduct_stock_for_order` |
| Update com itens alterados reverte e reaplica estoque | `sale_service` |
| Delete reverte estoque | `reverse_stock_for_sale` |
| Só produtos `kind=menu` nos itens | Validação backend |
| Insumos não vendáveis | `validate_order_stock` |
| Admin auth obrigatório nas escritas | `get_current_admin` |
| Venda com temp ID offline sincroniza depois | Padrão payables |
| `paidAt` define o dia do relatório (dia local no frontend) | Sem mudança de agrupamento |

## Critérios de aceite

- [ ] `POST /api/sales` cria venda manual com estoque deduzido
- [ ] `PATCH /api/sales/{id}` atualiza venda e ajusta estoque
- [ ] `DELETE /api/sales/{id}` remove venda e restaura estoque
- [ ] Endpoints de escrita retornam 401 sem token admin
- [ ] Offline: criar/editar/excluir venda no relatório de um dia passado
- [ ] Refresh — dados persistem (IndexedDB)
- [ ] Online: sync drena; PostgreSQL reflete correções
- [ ] Delta sync propaga correções para outros dispositivos
- [ ] `make frontend-lint` passa
- [ ] `ruff check backend/app` passa

## Teste manual

1. Admin → Relatórios → abrir dia passado
2. Offline: adicionar venda esquecida (mesa 3, 2x produto, motivo)
3. Verificar total do dia atualizado
4. Editar forma de pagamento — total inalterado, resumo dinheiro/cartão muda
5. Excluir venda com motivo — some do relatório
6. Online: sync → verificar `sales` e `stock_movements` no PostgreSQL
7. DevTools → IndexedDB → key `sales` persiste após refresh

## Estimativa

1–2 semanas.
