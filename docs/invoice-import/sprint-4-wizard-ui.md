# Sprint 4 — Wizard de Importação (UI)

## Prompt para o agente

```
Implemente o Sprint 4 do plano de importação de notas fiscais do projeto Restaurant.

Leia:
- docs/invoice-import/README.md
- docs/invoice-import/sprint-2-parser-makro.md (parser deve funcionar)
- docs/invoice-import/sprint-3-matching.md (suggest deve funcionar)
- docs/invoice-import/sprint-4-wizard-ui.md (este arquivo)
- frontend/AGENTS.md
- frontend/src/features/admin/components/AdminStockPage.tsx (referência de UX compra)
- .cursor/skills/frontend-expert/SKILL.md

1. Crie feature frontend/src/features/invoices/
2. Crie página /admin/notas-fiscais/importar
3. Implemente wizard 3 passos (fornecedor → itens → revisão)
4. Adicione item no menu admin

make frontend-lint ao final. Não implementar POST /confirm neste sprint (mock ou botão desabilitado).
```

## Pré-requisitos

- Sprint 2: `POST /api/invoices/parse` funcional
- Sprint 3: `POST /api/invoices/suggest` funcional
- Sprint 1: types de Supplier com `taxId`

## Objetivo

Interface para upload de PDF, revisão de sugestões de fornecedor/produtos, edição de valores, e preparação do payload de confirmação. **Confirmação real fica no sprint 5.**

## Fluxo do wizard

```
Passo 0: Upload PDF
    ↓ parse
Passo 1: Confirmar fornecedor
    ↓ suggest (com confirmedSupplierId)
Passo 2: Mapear itens (tabela)
    ↓
Passo 3: Revisão + opções
    ↓ (sprint 5) confirm
```

Estado do wizard em `useInvoiceImport` — pode usar `useReducer` ou state local. Persistir draft em `sessionStorage` para sobreviver refresh acidental.

## Arquivos a CRIAR

### `frontend/src/features/invoices/types.ts`

Espelhar schemas backend:

```typescript
export interface InvoiceDraft { ... }
export interface InvoiceItemDraft { ... }
export interface SupplierSuggestion { ... }
export interface ProductSuggestion { ... }
export interface ItemMappingState {
  lineNumber: number;
  draftItem: InvoiceItemDraft;
  suggestions: ProductSuggestion[];
  selectedProductId: string | null;
  action: "map" | "create_new" | "skip";
  quantity: number;
  unitCost: number;
  packType: string;
  confirmed: boolean;
}
export interface InvoiceImportWizardState {
  step: "upload" | "supplier" | "items" | "review";
  draft: InvoiceDraft | null;
  supplierSuggestions: SupplierSuggestion[];
  confirmedSupplierId: string | null;
  itemMappings: ItemMappingState[];
  purchasedAt: string;
  createPayable: boolean;
  notes: string;
}
```

### `frontend/src/features/invoices/services/invoiceService.ts`

```typescript
export async function parseInvoicePdf(file: File): Promise<InvoiceDraft>
export async function suggestMappings(draft: InvoiceDraft, confirmedSupplierId?: string): Promise<InvoiceSuggestResponse>
// confirmInvoice — sprint 5
```

Usar `apiFetch` com `FormData` para upload.

### `frontend/src/features/invoices/hooks/useInvoiceImport.ts`

- `uploadAndParse(file)`
- `confirmSupplier(supplierId)` → chama suggest novamente
- `selectProduct(lineNumber, productId)`
- `skipItem(lineNumber)`
- `confirmItem(lineNumber)` — marca item como confirmado
- `confirmAllHighConfidence(threshold = 90)` — confirma itens com top suggestion ≥ threshold
- `getProgress()` → `{ confirmed: N, total: M, mappable: K }`

### Componentes

```
frontend/src/features/invoices/components/
├── InvoiceImportWizard.tsx      # orquestrador + stepper
├── InvoiceUploadStep.tsx        # drag & drop PDF
├── SupplierConfirmStep.tsx      # sugestão + seleção + cadastro rápido
├── ItemMappingStep.tsx          # tabela de itens
├── ItemMappingRow.tsx           # linha individual
├── InvoiceReviewStep.tsx        # resumo + totais
└── ProductQuickCreateDialog.tsx # cadastro rápido de ingrediente
```

### `frontend/src/app/admin/notas-fiscais/importar/page.tsx`

```tsx
export default function InvoiceImportPage() {
  return <InvoiceImportWizard />;
}
```

## Detalhes de UI por passo

### Passo 0 — Upload

- Área drag & drop aceitando `.pdf`
- Loading durante parse
- Preview após parse:
  - Fornecedor extraído (`legalName` + `storeName`)
  - NIF, número fatura, data, total
  - "X itens encontrados"
- Erro 409: "Esta fatura já foi importada" (quando backend retornar)
- Erro 422: "Formato não reconhecido"

### Passo 1 — Fornecedor

Layout:

```
┌─────────────────────────────────────────────────────┐
│ A fatura indica:                                    │
│ MAKRO CASH & CARRY PORTUGAL, S.A. — MAKRO BRAGA     │
│ NIF: 502030712                                      │
│                                                     │
│ ★ Sugestão: MAKRO Braga (score 100)                 │
│   Motivo: NIF confirmado anteriormente              │
│                                                     │
│ [Confirmar sugestão]  [Escolher outro ▼]            │
│ [+ Cadastrar novo fornecedor]                       │
└─────────────────────────────────────────────────────┘
```

- Top suggestion **pré-selecionada** mas não confirmada
- Botão "Confirmar fornecedor" obrigatório para avançar
- Cadastro rápido: modal com `name`, `legalName`, `tradeName`, `taxId` pré-preenchidos do draft
- Usar `useSuppliers` + `createSupplier`

### Passo 2 — Itens

Tabela responsiva:

| ✓ | # | Descrição (NF) | Qtd | Un | Preço un. | Produto | Ação |
|---|---|----------------|-----|----|-----------|---------|------|

Por linha:

- Descrição e código EAN do draft (readonly)
- Inputs editáveis: `quantity`, `unitCost`
- Combobox de produto com top 5 sugestões + busca global
- Botões: **Confirmar** (1 clique se sugestão ok), **Pular**
- Badge de status: pendente / confirmado / ignorado
- Header: "12 de 31 itens confirmados"
- Ação em lote: "Confirmar todos com ≥ 90%"

**Cadastro rápido de produto** (`ProductQuickCreateDialog`):

- Pré-preenche `name` da descrição NF
- Defaults: `kind: "ingredient"`, `trackStock: true`, `stockUnit` mapeado de `packType`
- Após criar, seleciona automaticamente o novo produto na linha

Mapeamento `packType` → `StockUnit` (sugestão inicial):

| PACK | stockUnit |
|------|-----------|
| PC, CA, BX, BG, BT, SW | `un` |
| KG | `kg` |
| LT | `lt` |

### Passo 3 — Revisão

- Fornecedor confirmado (nome + NIF)
- Resumo: N itens confirmados, M ignorados
- Soma dos itens vs `draft.totals.totalIncVat` — alerta se divergência > 1 EUR
- Input: data da compra (default: `draft.issueDate`)
- Checkbox: "Criar conta a pagar" (desabilitado até sprint 5 ou com toast "em breve")
- Textarea: notas (default: número fatura + ATCUD)
- Botão **Confirmar importação** — desabilitado neste sprint com tooltip "Sprint 5"

## Arquivos a MODIFICAR

### `frontend/src/features/admin/components/AdminLayoutShell.tsx`

Adicionar nav item:

```typescript
{ href: "/admin/notas-fiscais/importar", label: "Importar NF", icon: FileUp }
```

Importar `FileUp` de `lucide-react`.

## Padrões a seguir

- Mesmo visual de `AdminStockPage` (cards, dialogs, `rounded-2xl`)
- `useSettings().formatCurrency` para valores
- Componentes shadcn existentes: `Dialog`, `Button`, `Input`, `Select`
- Sem mudar interface de `usePurchases`, `useSuppliers`, `useProductAdmin`

## Arquivos que NÃO TOCAR

- `invoice_import_service.confirm` (sprint 5)
- Backend além do que já existe
- Sync queue

## Critérios de aceite

- [ ] Upload PDF MAKRO → wizard avança com draft populado
- [ ] Passo fornecedor exige confirmação explícita
- [ ] Passo itens mostra 31+ linhas com scroll
- [ ] Confirmar sugestão marca linha como confirmada
- [ ] Pular item exclui da revisão
- [ ] Cadastro rápido de fornecedor e produto funciona
- [ ] "Confirmar todos ≥ 90%" funciona
- [ ] Revisão mostra totais e contagem
- [ ] Refresh na página restaura draft do sessionStorage
- [ ] `make frontend-lint` passa

## Teste manual

1. `/admin/notas-fiscais/importar`
2. Upload `fixtures/makro-braga-2026-06-28.pdf`
3. Confirmar fornecedor MAKRO (cadastrar se não existir)
4. Confirmar 5 itens, pular 2, cadastrar 1 produto novo
5. Revisar resumo — botão confirmar desabilitado

## Estimativa

5–7 dias.
