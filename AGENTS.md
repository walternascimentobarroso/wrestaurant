# Restaurant — Guia para Agentes

Monorepo fullstack para gestão de restaurante. Tudo roda via Docker Compose; use `make` na raiz do projeto.

## Estrutura

```
restaurant/
├── frontend/          # Next.js 16 + React 19 + Tailwind CSS 4
├── backend/           # FastAPI + SQLAlchemy + PostgreSQL
├── docker-compose.yml
├── Makefile
├── .env.example       # Copiado automaticamente para .env pelo Makefile
└── .cursor/skills/    # Skills especializadas do projeto
```

## Serviços

| Serviço | Container | Porta | Stack |
|---------|-----------|-------|-------|
| Frontend | `restaurant-frontend` | 3000 | Next.js, TypeScript |
| Backend | `restaurant-backend` | 8000 | FastAPI, Python |
| Banco | `restaurant-db` | 5432 | PostgreSQL 16 |

API do backend: prefixo `/api` (ex.: `GET /api/health`).

Frontend consome a API via `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Comandos essenciais

```bash
make help            # Lista todos os targets
make up              # Sobe os containers
make stop            # Para os containers
make health          # Verifica backend
make frontend-bash   # Shell no frontend
make backend-bash    # Shell no backend
make frontend-lint   # ESLint no frontend
make db-shell        # psql no PostgreSQL
```

Bootstrap: o Makefile cria `.env` a partir de `.env.example` se não existir.

## Onde trabalhar

| Tarefa | Diretório | Skill relacionada |
|--------|-----------|-------------------|
| UI, páginas, hooks, API client | `frontend/src/` | `frontend-expert` |
| Rotas, models, endpoints | `backend/app/` | — |
| Makefile, Docker, automação | raiz | `makefile-expert` |

## Skills do projeto

Skills em `.cursor/skills/` — descobertas automaticamente, sem configuração extra:

- **frontend-expert** — Next.js 16, React 19, Tailwind 4, integração FastAPI, arquitetura por features
- **makefile-expert** — Makefile, Docker Compose, targets e automação

Mencione a skill no prompt ou deixe o agente aplicá-la conforme a tarefa.

## Backend (FastAPI)

Stack: FastAPI, SQLAlchemy 2.x, Pydantic Settings, PostgreSQL. Código Python deve ser **Ruff-clean**.

### Estrutura atual

```
backend/app/
├── main.py              # App FastAPI, CORS, registro de routers
├── config.py            # Settings via pydantic-settings (.env)
├── database.py          # Engine, Base, get_db()
└── api/routes/
    └── health.py        # GET /api/health
```

### Estrutura alvo (ao expandir)

Organizar por domínio, não por tipo técnico solto:

```
backend/app/
├── main.py
├── config.py
├── database.py
├── api/
│   ├── deps.py          # Dependências compartilhadas (get_db, auth futuro)
│   └── routes/
│       ├── health.py
│       ├── orders.py    # /api/orders
│       └── menu.py      # /api/menu
├── models/              # SQLAlchemy ORM
│   └── order.py
├── schemas/             # Pydantic request/response
│   └── order.py
└── services/            # Regras de negócio (opcional, quando a rota crescer)
    └── order_service.py
```

### Padrões

| Camada | Responsabilidade |
|--------|------------------|
| **Route** (`api/routes/`) | HTTP, status codes, chama service ou query |
| **Schema** (`schemas/`) | Validação de entrada/saída (Pydantic) |
| **Model** (`models/`) | Tabelas SQLAlchemy |
| **Service** (`services/`) | Lógica de negócio reutilizável |

**Rotas:** registrar em `main.py` com `prefix="/api"`. Um arquivo por recurso.

```python
# api/routes/orders.py
router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/")
def list_orders(db: Session = Depends(get_db)) -> list[OrderRead]:
    ...
```

**Banco:** usar `get_db()` como dependency; nunca instanciar `SessionLocal()` direto na rota.

**Respostas:** tipar retornos (`-> OrderRead`, `-> dict[str, str]`). Erros com `HTTPException`.

**Config:** novas variáveis em `Settings` (`config.py`) + `.env.example`.

### Contrato com o frontend

- Endpoints expostos em `/api/*`
- Ao criar endpoint, criar/atualizar o service correspondente em `frontend/src/features/<feature>/services/`
- Manter nomes e shapes de JSON consistentes entre schema Pydantic e types TypeScript

### Comandos backend

```bash
make backend-bash    # Shell no container
make logs-backend    # Logs do FastAPI
make health          # GET /api/health
make db-shell        # psql
make dump-db         # Backup em backups/dump.sql
```

## Regras por área

- **Frontend:** leia `frontend/AGENTS.md` antes de escrever código Next.js — a versão 16 tem breaking changes
- **Backend:** Python Ruff-clean; SQLAlchemy 2.x; endpoints sob `/api`; lógica de negócio fora das rotas quando crescer
- **Geral:** escopo mínimo; não refatorar código não relacionado à tarefa

## Variáveis de ambiente

Ver `.env.example`. Principais:

- `POSTGRES_*` — credenciais e porta do banco
- `BACKEND_PORT` — porta do FastAPI (8000)
- `FRONTEND_PORT` — porta do Next.js (3000)
- `NEXT_PUBLIC_API_URL` — URL da API para o frontend
- `DATABASE_URL` — connection string PostgreSQL (uso interno do backend)
