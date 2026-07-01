# Sprint 3 — Motor de Sugestões

## Prompt para o agente

```
Implemente o Sprint 3 do plano de importação de notas fiscais do projeto Restaurant.

Leia:
- docs/invoice-import/README.md
- docs/invoice-import/sprint-1-foundation.md
- docs/invoice-import/sprint-2-parser-makro.md (deve estar concluído)
- docs/invoice-import/sprint-3-matching.md (este arquivo)
- backend/app/services/purchase_service.py
- backend/app/models/product.py

1. Crie invoice_matching_service.py com sugestões de fornecedor e produto
2. Adicione rapidfuzz em requirements.txt
3. Crie POST /api/invoices/suggest
4. Crie testes pytest para cenários de matching

Ruff-clean. Não implementar confirmação nem UI.
```

## Pré-requisitos

- Sprint 1 (aliases, suppliers com tax_id)
- Sprint 2 (InvoiceDraft disponível)

## Objetivo

Dado um `InvoiceDraft`, retornar sugestões ranqueadas de fornecedor e produto por item. O usuário **sempre confirma** depois — este sprint só calcula sugestões.

## Arquivos a CRIAR

### `backend/app/services/invoice_matching_service.py`

#### Sugestão de fornecedor

```python
def suggest_suppliers(db: Session, draft: InvoiceDraft) -> list[SupplierSuggestion]:
```

Ordem de prioridade (maior score primeiro):

| Prioridade | Condição | Score base | reason |
|------------|----------|------------|--------|
| 1 | `supplier_aliases.source_tax_id` = draft.supplier.taxId | 100 | `tax_id_alias` |
| 2 | `suppliers.tax_id` = draft.supplier.taxId | 98 | `tax_id_exact` |
| 3 | `supplier_aliases` por nome+loja normalizados | 90 + min(confirmed_count, 10) | `name_alias` |
| 4 | Fuzzy em `name`, `legal_name`, `trade_name` (rapidfuzz token_set_ratio ≥ 75) | ratio | `fuzzy` |
| 5 | Fornecedor com mais compras nos últimos 90 dias e nome parecido | 60 + ratio×0.3 | `purchase_history` |

Retornar top 5, deduplicado por `supplier_id`.

```python
class SupplierSuggestion(BaseModel):
    supplierId: str
    supplierName: str
    score: float
    reason: str
```

#### Sugestão de produto (por item)

Requer `confirmed_supplier_id` opcional — se fornecido, restringe aliases ao fornecedor.

```python
def suggest_item_mappings(
    db: Session,
    draft: InvoiceDraft,
    confirmed_supplier_id: str | None,
) -> list[ItemMappingSuggestion]:
```

Por item do draft:

| Prioridade | Condição | reason |
|------------|----------|--------|
| 1 | `product_mappings` com `supplier_id` + `external_code` | `code_mapping` |
| 2 | `product_mappings` com `supplier_id` + descrição normalizada | `description_mapping` |
| 3 | `purchase_records` do mesmo fornecedor + descrição fuzzy | `purchase_history` |
| 4 | Fuzzy em produtos `track_stock=True` (ingredientes) | `fuzzy` |
| 5 | Sem match | `needsManualMapping: true` |

```python
class ProductSuggestion(BaseModel):
    productId: str
    productName: str
    score: float
    reason: str

class ItemMappingSuggestion(BaseModel):
    lineNumber: int
    draftItem: InvoiceItemDraft
    suggestions: list[ProductSuggestion]   # top 5
    needsManualMapping: bool
    # valores pré-preenchidos (editáveis na UI):
    quantity: float
    unitCost: float                      # unitPrice do draft
    packType: str
```

**Cálculo de quantity/unitCost a partir do draft MAKRO:**

- `unitCost` = `totalPrice / quantity` (custo por unidade de compra)
- Para itens KG com `weightKg`: `quantity` = `weightKg`, `unitCost` = preço por kg
- `packType` preservado para exibição (PC, KG, etc.)

### `backend/app/schemas/invoice.py` (estender)

```python
class InvoiceSuggestRequest(BaseModel):
    draft: InvoiceDraft
    confirmedSupplierId: str | None = None

class InvoiceSuggestResponse(BaseModel):
    supplierSuggestions: list[SupplierSuggestion]
    itemMappings: list[ItemMappingSuggestion]
```

### `backend/app/api/routes/invoices.py` (estender)

```python
@router.post("/suggest", response_model=InvoiceSuggestResponse)
def suggest_mappings(
    body: InvoiceSuggestRequest,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceSuggestResponse:
    ...
```

### `backend/tests/test_invoice_matching.py`

Cenários:

1. **Sem aliases** — fuzzy sugere fornecedor "MAKRO" se existir no banco
2. **Com alias** — após seed de `supplier_aliases` com tax_id 502030712, score 100
3. **Product mapping** — seed mapping `5601660974707` → produto "Arroz", retorna como top 1
4. **Item desconhecido** — `needsManualMapping: true`, suggestions vazia ou só fuzzy baixo

## Dependência

```
rapidfuzz==3.10.1
```

## Seed de teste (opcional no teste, não em produção)

```python
# Fornecedor
Supplier(id="makro", name="MAKRO Braga", tax_id="502030712", legal_name="MAKRO CASH & CARRY PORTUGAL, S.A.")

# Alias
SupplierAlias(supplier_id="makro", source_tax_id="502030712", source_name_normalized="makro cash carry portugal", confirmed_count=3)

# Mapping
ProductMapping(supplier_id="makro", external_code="5601660974707", external_description_normalized="arroz e.l agulha 1kg aro", product_id="arroz-agulha", confirmed_count=2)
```

## Arquivos que NÃO TOCAR

- `invoice_import_service.confirm` (sprint 5)
- Frontend wizard (sprint 4)
- Sync handlers

## Critérios de aceite

- [ ] `POST /suggest` com draft MAKRO retorna sugestões de fornecedor
- [ ] Com alias seedado, MAKRO aparece em 1º com score ≥ 100
- [ ] Item `5601660974707` com mapping seedado → produto correto em 1º
- [ ] Item sem mapping → `needsManualMapping: true`
- [ ] Recalcular com `confirmedSupplierId` melhora sugestões de produto
- [ ] Testes pytest passam
- [ ] Ruff passa

## Teste manual

1. Cadastrar fornecedor MAKRO com `taxId: 502030712`
2. Parse PDF → copiar draft
3. POST `/suggest` → verificar ranking
4. Inserir alias manual no banco → repetir → alias no topo

## Estimativa

3–4 dias.
