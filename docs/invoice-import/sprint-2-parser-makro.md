# Sprint 2 — Parser PDF MAKRO

## Prompt para o agente

```
Implemente o Sprint 2 do plano de importação de notas fiscais do projeto Restaurant.

Leia:
- docs/invoice-import/README.md
- docs/invoice-import/sprint-1-foundation.md (deve estar concluído)
- docs/invoice-import/sprint-2-parser-makro.md (este arquivo)
- docs/invoice-import/fixtures/makro-braga-2026-06-28.pdf
- docs/invoice-import/fixtures/makro-braga-2026-06-28.expected.json

1. Adicione pdfplumber (ou pymupdf) em backend/requirements.txt
2. Crie parser makro_pt em services/invoice_parsers/makro_pt.py
3. Crie registry de parsers em services/invoice_parsers/__init__.py
4. Crie POST /api/invoices/parse (multipart PDF)
5. Crie testes pytest com o PDF fixture

O parser deve retornar InvoiceDraft compatível com o JSON expected.
Ruff-clean. Não implementar matching nem wizard.
```

## Pré-requisitos

- Sprint 1 concluído (`InvoiceDraft` schema, tabelas criadas)

## Objetivo

Extrair dados estruturados do PDF de fatura MAKRO Portugal e expor via API. Este é o **primeiro template**; a arquitetura deve permitir adicionar outros parsers depois.

## Fixture de referência

| Arquivo | Uso |
|---------|-----|
| `fixtures/makro-braga-2026-06-28.pdf` | Input real (31 itens + linhas ignoradas) |
| `fixtures/makro-braga-2026-06-28.expected.json` | Output esperado do parser |

### Estrutura do PDF MAKRO (análise do fixture)

**Cabeçalho (página 1):**

```
MAKRO CASH & CARRY PORTUGAL, S.A. MAKRO BRAGA
Nº Contribuinte: 502030712
Data da venda 28-06-2026 13:15
ATCUD:J6FSWPBP-023508
Factura Nº FAC 08004202601/023508
```

**Tabela de itens** — colunas:

```
M* | Código Artigo | Descrição Artigo | PACK | PR Unit/KG | Unit/KG | Preço U.V. | Quant | Valor total | IvaDD | DP | MOT
```

**Linha de produto típica** (regex base):

```
{EAN13} {DESCRIÇÃO} {PACK} {preços...} {qtd} {total} {iva}
```

Exemplo:

```
5601660974707 ARO OLEO ALIMENTAR 5L PC 7,220 1 7,22 2 14,44 5
```

- `externalCode` = EAN de 13 dígitos no início da linha
- `packType` = `PC`, `CA`, `KG`, `BG`, `BX`, `BT`, `SW`
- Valores monetários usam vírgula decimal (`7,22`)
- Itens por peso (KG): incluir `weightKg` quando coluna Unit/KG ≠ 1

**Linhas a IGNORAR** (não viram item):

| Padrão | Motivo |
|--------|--------|
| Começa com `+` | Taxa IEC, depósito embalagem |
| `DEPOSITO` | Depósito de garrafa/lata |
| `TAXA IEC` / `IEC BEB` | Impostos embutidos |
| `Campanha` / `Desconto` | Descontos globais |
| `Valor a transportar` / `Valor transportado` | Continuação entre páginas |
| Cabeçalho repetido pág. 2 | Metadata |
| `Nº de artigos` / `Valor Total` | Rodapé |

**Totais (página 2):**

```
Total s/ IVA: 131,83
Valor Total 153,69
```

**Identificador único:** `ATCUD` (`J6FSWPBP-023508`) → campo `documentId`.

## Arquivos a CRIAR

### `backend/app/services/invoice_parsers/base.py`

```python
from abc import ABC, abstractmethod

class InvoiceParser(ABC):
    template: str

    @abstractmethod
    def can_parse(self, text: str) -> bool: ...

    @abstractmethod
    def parse(self, file_bytes: bytes) -> InvoiceDraft: ...
```

### `backend/app/services/invoice_parsers/makro_pt.py`

```python
class MakroPortugalParser(InvoiceParser):
    template = "makro_pt"

    def can_parse(self, text: str) -> bool:
        return "MAKRO" in text and "Nº Contribuinte:" in text

    def parse(self, file_bytes: bytes) -> InvoiceDraft:
        ...
```

**Estratégia de extração:**

1. `pdfplumber` → extrair texto de todas as páginas, concatenar
2. Regex para cabeçalho: `Nº Contribuinte:\s*(\d+)`, `ATCUD:(\S+)`, `Factura Nº\s+(.+)`, `Data da venda\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2})`
3. Para cada linha: tentar match `^(\d{13})\s+(.+?)\s+(PC|CA|KG|BG|BX|BT|SW)\s+([\d,.\s]+)$`
4. Parsear colunas numéricas da direita para esquerda (iva, total, quant, preço)
5. Acumular `skippedLines` com `reason` para debug
6. Validar: soma dos `totalPrice` dos itens ≈ `subtotalExVat` (tolerância 0,50 EUR — descontos globais não estão nos itens)

### `backend/app/services/invoice_parsers/registry.py`

```python
PARSERS: list[InvoiceParser] = [MakroPortugalParser()]

def detect_and_parse(file_bytes: bytes) -> InvoiceDraft:
    text = extract_raw_text(file_bytes)
    for parser in PARSERS:
        if parser.can_parse(text):
            return parser.parse(file_bytes)
    raise UnsupportedInvoiceFormatError(...)
```

### `backend/app/api/routes/invoices.py`

```python
router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.post("/parse", response_model=InvoiceDraft)
async def parse_invoice(
    file: UploadFile,
    db: Session = Depends(get_db_session),
    _admin: str = Depends(get_current_admin),
) -> InvoiceDraft:
    ...
```

Comportamento:

- Aceitar `application/pdf` apenas
- Calcular `raw_file_hash` (SHA-256)
- Verificar duplicata: `document_id` já em `invoice_imports` com `status=confirmed` → HTTP 409
- **Não persistir** draft neste endpoint (stateless)
- Erro 422 se formato não reconhecido

### `backend/tests/test_makro_parser.py`

```python
def test_makro_fixture_matches_expected():
    pdf_bytes = FIXTURES_DIR.joinpath("makro-braga-2026-06-28.pdf").read_bytes()
    draft = detect_and_parse(pdf_bytes)
    expected = json.loads(EXPECTED_JSON.read_text())
    assert draft.document_id == expected["documentId"]
    assert len(draft.items) == len(expected["items"])
    # comparar item a item (externalCode, description, quantity, totalPrice)
```

Registrar router em `backend/app/main.py`.

## Dependência

Adicionar em `backend/requirements.txt`:

```
pdfplumber==0.11.4
```

Alternativa aceitável: `pymupdf` — documentar escolha no código.

## Arquivos que NÃO TOCAR

- Matching service (sprint 3)
- Frontend (sprint 4)
- `purchase_service.py`

## Critérios de aceite

- [ ] `POST /api/invoices/parse` com PDF fixture retorna 31 itens
- [ ] `documentId` = `J6FSWPBP-023508`
- [ ] `supplier.taxId` = `502030712`
- [ ] `totals.totalIncVat` = `153.69`
- [ ] Linhas de depósito/taxa **não** aparecem em `items`
- [ ] `skippedLines` documenta linhas ignoradas
- [ ] PDF de outro fornecedor → 422 com mensagem clara
- [ ] Teste pytest passa no container backend
- [ ] Ruff passa

## Teste manual

```bash
curl -X POST http://localhost:8000/api/invoices/parse \
  -H "Authorization: Bearer <admin>" \
  -F "file=@docs/invoice-import/fixtures/makro-braga-2026-06-28.pdf"
```

Verificar JSON contra `expected.json`.

## Notas para parsers futuros

- Cada parser implementa `InvoiceParser`
- Registrar em `PARSERS` por ordem de especificidade
- `template` identifica origem no `InvoiceImport`
- XML NF-e Brasil: parser separado `nfe_br` (futuro)

## Estimativa

4–5 dias.
