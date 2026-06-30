# Fase 2 — Admin CRUD Offline

## Prompt para o agente

```
Implemente a Fase 2 do plano offline-first do projeto Restaurant.

Leia:
- docs/offline-first/README.md
- docs/offline-first/phase-1-mesas.md (deve estar concluída)
- docs/offline-first/phase-2-admin-crud.md (este arquivo)
- frontend/AGENTS.md

Migre WRITES offline para:
- productStorage.ts (CRUD completo)
- menuCatalogStorage.ts (CRUD categorias/subcategorias)
- tableStorage.ts (admin: create/update/delete mesa — se não feito na fase 1)

Registre sync handlers. Hooks admin não mudam interface.
make frontend-lint ao final.
```

## Pré-requisitos

- Fase 0 (infra)
- Fase 1 (mesas + leitura de produtos/menu/settings)

## Objetivo

Painel admin (`/admin/*`) funciona offline para CRUD de produtos, categorias do cardápio e gestão de mesas.

## Arquivos a MODIFICAR

### `frontend/src/features/menu/services/productStorage.ts`

Migrar writes para offline:

| Função | Mutation local | Sync API |
|--------|----------------|----------|
| `createProductApi` | `store.mutate` + temp UUID | `POST /products` |
| `updateProductApi` | idem | `PATCH /products/{id}` |
| `deleteProductApi` | soft delete ou remove | `DELETE /products/{id}` |

**Funções puras** (criar `productMutations.ts` se necessário):

- `applyCreateProduct`, `applyUpdateProduct`, `applyDeleteProduct`
- Manter helpers: `renameCategoryInProducts`, `countProductsByCategory`, etc.

**Atenção:** `useProductAdmin` usa `getTablesSnapshot` para validar exclusão — deve ler cache local, não API.

### `frontend/src/features/menu/services/menuCatalogStorage.ts`

Migrar writes:

| Função | Sync API |
|--------|----------|
| `createCategoryApi` | `POST /menu/categories` |
| `updateCategoryApi` | `PATCH /menu/categories/{id}` |
| `deleteCategoryApi` | `DELETE /menu/categories/{id}` |
| `createSubcategoryApi` | `POST /menu/categories/{id}/subcategories` |
| `updateSubcategoryApi` | `PATCH /menu/subcategories/{id}` |
| `deleteSubcategoryApi` | `DELETE /menu/subcategories/{id}` |

Renomear categoria localmente deve propagar para produtos em cache (`renameCategoryInProducts` no productStorage).

### `frontend/src/features/tables/services/tableStorage.ts`

Confirmar/completar admin CRUD offline (se fase 1 não cobriu 100%):

- `createTableApi`, `updateTableApi`, `deleteTableApi`

### `frontend/src/features/sync/services/syncService.ts`

Registrar handlers:

- `products` — create, update, delete
- `menu` — todas operations de categoria/subcategoria

Atualizar `hydrateAll()` se necessário.

## Arquivos a CRIAR (opcional)

### `frontend/src/features/menu/services/productMutations.ts`

Funções puras de mutação local de produtos.

### `frontend/src/features/menu/services/menuMutations.ts`

Funções puras de mutação local do catálogo.

## Arquivos que NÃO TOCAR

- `frontend/src/features/sales/`, `payables/`, `stock/`, `checklists/`, `purchases/`, `suppliers/` — fase 3+
- Hooks — manter assinaturas
- `backend/` — REST existente

## Regras de negócio offline

| Regra | Implementação |
|-------|---------------|
| Não excluir produto em uso numa mesa | Validar contra `getTablesSnapshot()` local antes de `deleteProductApi` |
| Renomear categoria | Atualizar produtos em cache na mesma `mutate` transacional (dois stores ou callback) |
| Produto com `track_stock` | Manter campos de estoque no objeto local; sync valida no servidor |

## Critérios de aceite

- [ ] Criar/editar/excluir produto offline — persiste local + enfileira
- [ ] CRUD de categorias/subcategorias offline
- [ ] Admin mesas offline (criar, editar, excluir)
- [ ] Sync drena corretamente ao reconectar
- [ ] Validação "produto em uso" funciona offline
- [ ] `make frontend-lint` passa
- [ ] Páginas admin compilam: `AdminProductsPage`, `AdminTablesPage`, `AdminCategoriesPage`

## Teste manual

1. Offline: criar produto, categoria, mesa nova
2. Refresh — dados persistem
3. Online: sync → verificar no admin com backend
4. Offline: tentar excluir produto que está numa mesa — deve falhar com mensagem

## Estimativa

2 semanas.
