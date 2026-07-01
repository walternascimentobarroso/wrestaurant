# Sprint 5 — Confirmação, Aliases e Polimento

## Prompt para o agente

```
Implemente o Sprint 5 do plano de importação de notas fiscais do projeto Restaurant.

Leia:
- docs/invoice-import/README.md
- docs/invoice-import/sprint-1-foundation.md
- docs/invoice-import/sprint-4-wizard-ui.md (wizard deve estar concluído)
- docs/invoice-import/sprint-5-confirm-polish.md (este arquivo)
- backend/app/services/purchase_service.py
- frontend/src/features/purchases/services/purchaseStorage.ts

1. Crie invoice_import_service.confirm com transação atômica
2. Crie POST /api/invoices/confirm
3. Habilite botão de confirmação no wizard
4. Crie página de histórico /admin/notas-fiscais
5. Opcional: sync handler + hydrate para invoice_imports
6. Testes pytest de confirmação

Ruff-clean + make frontend-lint ao final.
```

## Pré-requisitos

- Sprints 1–4 concluídos
- Wizard funcional até passo de revisão

## Objetivo

Persistir importação confirmada: compras em lote, atualização de estoque, gravação de aliases para aprendizado, anti-duplicata, e histórico consultável.

## Arquivos a CRIAR

### `backend/app/services/invoice_import_service.py`

```python
def confirm_invoice_import(
    db: Session,
    draft: InvoiceDraft,
    confirmed_supplier_id: str,
    item_mappings: list[ConfirmedItemMapping],
    options: InvoiceConfirmOptions,
) -> InvoiceConfirmResult:
```

#### `ConfirmedItemMapping`

```python
class ConfirmedItemMapping(BaseModel):
    lineNumber: int
    productId: str
    quantity: float
    unitCost: float
    action: Literal["map", "create_new"]  # skip não entra
```

#### `InvoiceConfirmOptions`

```python
class InvoiceConfirmOptions(BaseModel):
    purchasedAt: datetime
    notes: str | None = None
    createPayable: bool = False
    payableCategoryId: str | None = None
    rawFileHash: str | None = None
```

#### Fluxo da transação (ordem importa)

```
BEGIN
1. Validar: document_id não existe com status=confirmed
2. Validar: supplier existe
3. Validar: cada productId existe
4. Validar: pelo menos 1 item mapeado
5. Criar InvoiceImport(status=confirmed)
6. Para cada item mapeado:
     record_purchase(db, PurchaseCreate(...))
7. Upsert supplier_aliases (incrementar confirmed_count)
8. Upsert product_mappings por item (external_code + description)
9. Se supplier.tax_id vazio → preencher do draft
10. Se createPayable → criar Payable vinculado
COMMIT
```

Em qualquer erro → `ROLLBACK`, HTTP 400/409 com mensagem clara.

#### Upsert de aliases

**Supplier alias:**

```python
SupplierAlias(
    supplier_id=confirmed_supplier_id,
    source_tax_id=normalize_tax_id(draft.supplier.taxId),
    source_name_normalized=normalize_name(draft.supplier.legalName),
    source_store_name=draft.supplier.storeName,
    confirmed_count=existing.confirmed_count + 1 if existing else 1,
    last_confirmed_at=utc_now(),
)
```

**Product mapping** (por item confirmado):

```python
ProductMapping(
    supplier_id=confirmed_supplier_id,
    external_code=item.draftItem.externalCode,
    external_description_normalized=normalize_name(item.draftItem.description),
    product_id=confirmed.productId,
    confirmed_count=...,
    last_confirmed_at=utc_now(),
)
```

Reutilizar `record_purchase()` — **não duplicar** lógica de estoque.

### `backend/app/schemas/invoice.py` (estender)

```python
class InvoiceConfirmRequest(BaseModel):
    draft: InvoiceDraft
    confirmedSupplierId: str
    itemMappings: list[ConfirmedItemMapping]
    options: InvoiceConfirmOptions

class InvoiceConfirmResult(BaseModel):
    invoiceImportId: str
    purchaseIds: list[str]
    payableId: str | None
    itemsImported: int
    itemsSkipped: int
```

### `backend/app/api/routes/invoices.py` (estender)

```python
@router.post("/confirm", response_model=InvoiceConfirmResult, status_code=201)
def confirm_invoice(...) -> InvoiceConfirmResult:

@router.get("", response_model=list[InvoiceImportRead])
def list_invoice_imports(...) -> list[InvoiceImportRead]:

@router.get("/{import_id}", response_model=InvoiceImportDetailRead)
def get_invoice_import(...) -> InvoiceImportDetailRead:
```

### `backend/tests/test_invoice_confirm.py`

1. Confirmar draft MAKRO com 3 itens → 3 `purchase_records`
2. Reconfirmar mesmo `documentId` → 409
3. Alias criado → segunda suggest prioriza fornecedor
4. Product mapping criado → segunda suggest prioriza produto
5. `createPayable=true` → payable criado com valor `totalIncVat`

## Arquivos a MODIFICAR

### `frontend/src/features/invoices/services/invoiceService.ts`

```typescript
export async function confirmInvoice(payload: InvoiceConfirmRequest): Promise<InvoiceConfirmResult>
export async function listInvoiceImports(): Promise<InvoiceImportSummary[]>
```

### `frontend/src/features/invoices/hooks/useInvoiceImport.ts`

- `confirmImport()` → monta payload, chama API, limpa sessionStorage
- Após sucesso: toast + redirect para `/admin/notas-fiscais` ou `/admin/compras`

### `frontend/src/features/invoices/components/InvoiceReviewStep.tsx`

- Habilitar botão "Confirmar importação"
- Checkbox createPayable funcional (usar categoria padrão de payables ou select)
- Loading state durante confirmação
- Erro 409 → mensagem de duplicata

### `frontend/src/app/admin/notas-fiscais/page.tsx`

Lista de importações:

| Data | Fornecedor | Fatura | Itens | Total | Status |
|------|------------|--------|-------|-------|--------|

Link para detalhe com itens importados (purchase IDs).

### `frontend/src/features/admin/components/AdminLayoutShell.tsx`

```typescript
{ href: "/admin/notas-fiscais", label: "Notas fiscais", icon: FileText }
```

### Hydrate local (opcional mas recomendado)

Se seguir padrão offline-first:

- `invoiceStorage.ts` com `createOfflineStore` **somente leitura** (importações são server-authoritative)
- `hydrateFromServer("invoices", () => apiFetch("/invoices"))`
- Confirmação: chamar API direto (online required) + invalidate/hydrate purchases e products

**Nota:** parse e confirm **exigem online** — não enfileirar na sync queue. Apenas lista de histórico pode ser cacheada.

### `backend/app/api/routes/sync.py` (opcional)

Incluir `invoice_imports` no snapshot/delta se já existir padrão para outras entidades.

## Integração com Payable

Quando `createPayable=true`:

```python
Payable(
    category_id=options.payableCategoryId or default_supplies_category,
    description=f"Fatura {draft.invoiceNumber} — {supplier.name}",
    supplier_id=confirmed_supplier_id,
    amount=draft.totals.totalIncVat,
    due_date=options.purchasedAt.date() + timedelta(days=30),  # ou purchasedAt
    notes=options.notes,
    status="pending",
)
```

Usar service existente de payables se houver.

## Regras de negócio

| Regra | Comportamento |
|-------|---------------|
| Duplicata | `document_id` único — HTTP 409 |
| Confirmação humana | Backend rejeita item sem `productId` |
| Item skip | Não gera purchase nem mapping |
| Divergência de total | UI alerta; backend aceita (descontos globais) |
| Estoque | Via `record_purchase` existente |
| Custo produto | `last_purchase_cost` atualizado automaticamente |

## Arquivos que NÃO TOCAR

- Parser MAKRO (sprint 2) — só corrigir bugs se teste falhar
- Lógica core de `record_purchase` — chamar, não reescrever

## Critérios de aceite

- [ ] Confirmar importação MAKRO cria N compras visíveis em `/admin/compras`
- [ ] Estoque dos produtos atualizado
- [ ] Reimportar mesma fatura → erro de duplicata
- [ ] 2ª importação MAKRO → fornecedor sugerido via alias
- [ ] Item com EAN já mapeado → produto sugerido no topo
- [ ] Histórico em `/admin/notas-fiscais`
- [ ] Payable opcional criado
- [ ] Testes pytest passam
- [ ] Ruff + `make frontend-lint` passam

## Teste manual (fluxo completo)

1. Cadastrar fornecedor MAKRO com NIF 502030712
2. Importar PDF fixture pela primeira vez
3. Mapear ~10 itens (mix: confirmar, pular, criar novo)
4. Confirmar → verificar compras e estoque
5. Importar PDF novamente → bloqueio duplicata
6. Importar outra fatura MAKRO (se disponível) → fornecedor no topo
7. Verificar histórico em `/admin/notas-fiscais`

## Estimativa

5–6 dias.
