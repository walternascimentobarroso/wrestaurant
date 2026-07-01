# Sprint 1 — Fundação de Dados

## Prompt para o agente

```
Implemente o Sprint 1 do plano de importação de notas fiscais do projeto Restaurant.

Leia:
- docs/invoice-import/README.md
- docs/invoice-import/sprint-1-foundation.md (este arquivo)
- backend/app/models/supplier.py
- backend/app/models/purchase.py
- backend/app/services/migrations.py
- AGENTS.md

1. Estenda Supplier com tax_id, trade_name, legal_name
2. Crie models: InvoiceImport, SupplierAlias, ProductMapping
3. Adicione migrations SQL leves em migrations.py
4. Crie schemas Pydantic em schemas/invoice.py (draft types)
5. Registre models em models/__init__.py
6. Atualize supplier schemas e mappers (camelCase no JSON)
7. Atualize types TypeScript de Supplier

Ruff-clean no backend. Não implementar parser nem UI neste sprint.
```

## Pré-requisitos

- Offline-first fases 0–5 concluídas
- Domínio de compras, fornecedores e produtos operacional

## Objetivo

Preparar o banco e os contratos de dados para importação de faturas, aliases de fornecedor/produto e auditoria de notas importadas.

## Arquivos a CRIAR

### `backend/app/models/invoice_import.py`

```python
class InvoiceImport(Base, TimestampMixin):
    __tablename__ = "invoice_imports"

    id: str                          # UUID
    template: str                    # ex: "makro_pt"
    document_id: str                 # ATCUD ou chave única — UNIQUE
    invoice_number: str | None
    supplier_id: str | None          # FK suppliers (preenchido na confirmação)
    issue_date: datetime
    subtotal_ex_vat: float | None
    total_inc_vat: float | None
    currency: str                    # default "EUR"
    status: str                      # draft | confirmed | cancelled
    raw_file_hash: str | None        # SHA-256 do PDF
    item_count: int
    confirmed_at: datetime | None
```

Índice único em `document_id`.

### `backend/app/models/supplier_alias.py`

```python
class SupplierAlias(Base, TimestampMixin):
    __tablename__ = "supplier_aliases"

    id: int                          # autoincrement
    supplier_id: str                 # FK suppliers
    source_tax_id: str | None        # NIF/CNPJ normalizado (só dígitos)
    source_name_normalized: str
    source_store_name: str | None    # ex: "MAKRO BRAGA"
    confirmed_count: int             # default 0
    last_confirmed_at: datetime | None
```

Índice composto: `(source_tax_id)` e `(source_name_normalized, source_store_name)`.

### `backend/app/models/product_mapping.py`

```python
class ProductMapping(Base, TimestampMixin):
    __tablename__ = "product_mappings"

    id: int
    supplier_id: str                 # FK suppliers
    external_code: str | None        # EAN/código artigo (ex: 5601660974707)
    external_description_normalized: str
    product_id: str                  # FK products
    unit_factor: float | None        # conversão opcional (futuro)
    confirmed_count: int
    last_confirmed_at: datetime | None
```

Índice composto: `(supplier_id, external_code)` e `(supplier_id, external_description_normalized)`.

### `backend/app/schemas/invoice.py`

Schemas base (sem parser ainda):

| Schema | Campos principais |
|--------|-------------------|
| `InvoiceSupplierDraft` | `legalName`, `storeName?`, `taxId` |
| `InvoiceItemDraft` | `lineNumber`, `externalCode`, `description`, `packType`, `unitPrice`, `quantity`, `totalPrice`, `vatCode?`, `weightKg?` |
| `InvoiceDraft` | `template`, `documentId`, `invoiceNumber?`, `issueDate`, `supplier`, `items[]`, `totals`, `skippedLines?` |
| `InvoiceTotalsDraft` | `subtotalExVat?`, `totalIncVat`, `currency` |

Usar aliases camelCase no JSON (`legalName`, `documentId`, etc.) — seguir padrão de `PurchaseRecordRead`.

### `backend/app/services/text_normalization.py`

Funções puras reutilizáveis:

```python
def normalize_tax_id(value: str) -> str:
    """Remove prefixo PT, pontos, hífens — retorna só dígitos."""

def normalize_name(value: str) -> str:
    """Lowercase, sem acentos, remove LTDA/SA/S.A./GROSSISTA, colapsa espaços."""
```

## Arquivos a MODIFICAR

### `backend/app/models/supplier.py`

Adicionar:

```python
tax_id: Mapped[str | None] = mapped_column(String(32), unique=True)  # normalizado
trade_name: Mapped[str | None] = mapped_column(String(255))        # loja/fantasia
legal_name: Mapped[str | None] = mapped_column(String(255))          # razão social
```

`name` continua sendo o nome de exibição principal (pode ser `trade_name` ou `legal_name`).

### `backend/app/schemas/supplier.py` + `app/services/mappers.py`

Expor `taxId`, `tradeName`, `legalName` no read/update.

### `backend/app/services/migrations.py`

Adicionar migration para:

1. Colunas novas em `suppliers`
2. Tabelas `invoice_imports`, `supplier_aliases`, `product_mappings`
3. Incluir `invoice_imports` em `_UPDATED_AT_COLUMNS` com fallback `confirmed_at`

### `backend/app/models/__init__.py`

Exportar os 3 novos models.

### `frontend/src/features/suppliers/types.ts`

```typescript
export interface Supplier {
  // ...existentes
  taxId?: string;
  tradeName?: string;
  legalName?: string;
}
```

Atualizar `SupplierInput` se necessário.

## Arquivos que NÃO TOCAR

- Parser, rotas `/invoices/*`
- Wizard frontend
- `purchase_service.py` (sprint 5)

## Critérios de aceite

- [ ] `make up` + boot do backend cria tabelas/colunas sem erro
- [ ] Supplier aceita `taxId` via API existente (`PATCH /suppliers/{id}`)
- [ ] Schemas `InvoiceDraft` importáveis sem circular dependency
- [ ] `normalize_tax_id("PT502030712")` → `"502030712"`
- [ ] `normalize_name("MAKRO CASH & CARRY PORTUGAL, S.A.")` → string comparável
- [ ] Ruff passa no backend

## Teste manual

1. `make backend-bash` → verificar tabelas no psql
2. Atualizar fornecedor MAKRO com `taxId: "502030712"` via API ou admin
3. Confirmar que suppliers existentes não quebram (campos opcionais)

## Estimativa

3–4 dias.
