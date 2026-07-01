# Importação de Notas Fiscais — Plano por Sprint

Plano dividido em arquivos para execução por agentes independentes. Cada sprint é autocontido: leia o arquivo do sprint, execute as tarefas listadas, valide os critérios de aceite.

## Objetivo

Importar faturas de fornecedores (PDF no v1), extrair itens automaticamente, **sugerir** fornecedor e produtos com base em histórico e aliases salvos, e permitir que o usuário **sempre confirme** antes de registrar compras e estoque.

## Princípios obrigatórios

1. **Sugestão, nunca auto-aplicação** — mesmo com score 100%, o usuário confirma explicitamente.
2. **Aprendizado incremental** — cada confirmação grava alias (fornecedor + produto) para priorizar na próxima importação.
3. **Reutilizar domínio existente** — `record_purchase()`, estoque, fornecedores, produtos, payables.
4. **Parser por template** — v1 cobre PDF MAKRO; novos fornecedores/formatos entram como parsers adicionais.

## Arquitetura

```
Upload PDF
  → POST /api/invoices/parse  (detecta template + extrai draft)
  → POST /api/invoices/suggest (fornecedor + produtos)
  → Wizard UI (confirmar fornecedor → mapear itens → revisar)
  → POST /api/invoices/confirm (transação: compras + aliases + invoice_import)
       ↓
  purchase_service.record_purchase() × N itens
  supplier_aliases / product_mappings (memória)
```

## Documento de referência (v1)

Fatura real usada como fixture de desenvolvimento e testes:

| Campo | Valor |
|-------|-------|
| Arquivo | `docs/invoice-import/fixtures/makro-braga-2026-06-28.pdf` |
| Fornecedor | MAKRO CASH & CARRY PORTUGAL, S.A. — MAKRO BRAGA |
| NIF fornecedor | `502030712` |
| Fatura | `FAC 08004202601/023508` |
| ATCUD | `J6FSWPBP-023508` |
| Data venda | `2026-06-28T13:15` |
| Itens produto | 31 linhas (excluir taxas, depósitos, descontos) |
| Total c/ IVA | `153,69 EUR` |
| Total s/ IVA | `131,83 EUR` |

Ver também: `docs/invoice-import/fixtures/makro-braga-2026-06-28.expected.json` (saída esperada do parser).

## Ordem de execução

| Sprint | Arquivo | Entregável principal |
|--------|---------|-------------------|
| 1 | [sprint-1-foundation.md](./sprint-1-foundation.md) | Models, migrations, `tax_id` em suppliers |
| 2 | [sprint-2-parser-makro.md](./sprint-2-parser-makro.md) | Parser PDF MAKRO + `POST /invoices/parse` |
| 3 | [sprint-3-matching.md](./sprint-3-matching.md) | Motor de sugestões + `POST /invoices/suggest` |
| 4 | [sprint-4-wizard-ui.md](./sprint-4-wizard-ui.md) | Wizard frontend (3 passos) |
| 5 | [sprint-5-confirm-polish.md](./sprint-5-confirm-polish.md) | Confirmação em lote, aliases, histórico, sync |

## Integração com código existente

| Domínio | Arquivo | Uso na importação |
|---------|---------|-------------------|
| Compras | `backend/app/services/purchase_service.py` | `record_purchase()` por item confirmado |
| Estoque | `backend/app/services/stock_service.py` | Já chamado dentro de `record_purchase` |
| Fornecedores | `backend/app/models/supplier.py` | Match por `tax_id` + aliases |
| Produtos | `backend/app/models/product.py` | Match por código/descrição + aliases |
| Payables | `backend/app/models/payable.py` | Opcional na confirmação |
| Frontend compras | `frontend/src/features/purchases/` | Hydrate após confirmação |
| Frontend estoque | `frontend/src/features/admin/components/AdminStockPage.tsx` | Fluxo manual permanece |

## Parsers suportados (roadmap)

| Template | Formato | Sprint |
|----------|---------|--------|
| `makro_pt` | PDF fatura MAKRO Portugal | Sprint 2 |
| `nfe_br` | XML NF-e Brasil | Futuro |
| Outros PDF | Por fornecedor | Futuro |

## Teste manual (checklist global)

```
[ ] Upload PDF MAKRO fixture → draft com 31 itens
[ ] Sugestão de fornecedor MAKRO (ou alias após 1ª confirmação)
[ ] Mapear 3 itens: confirmar sugestão, selecionar manual, cadastrar novo
[ ] Revisão mostra totais e divergências
[ ] Confirmar → N compras em purchase_records + estoque atualizado
[ ] Reimportar mesma fatura → bloqueio por duplicata (ATCUD)
[ ] Segunda fatura MAKRO → fornecedor sugerido no topo por alias
[ ] Item com mesmo código EAN → produto sugerido no topo por mapping
[ ] make frontend-lint + Ruff no backend passam
```

## Estimativa total

4–5 semanas (1 sprint por semana, com margem no sprint 5).
