# Makefile Reference Template

Baseado em `Exemplo-Makefile`. Adapte nomes de serviços, variáveis e seções ao projeto analisado.

## Template completo

```makefile
# File variables
FILE1 = .env
FILE2 = .env.example

# Check if .env file exists
ifeq (,$(wildcard $(FILE1)))
$(shell cp $(FILE2) $(FILE1))
endif

# Load environment variables
include .env
export $(shell sed 's/=.*//' .env)

# Color Config
NOCOLOR=\033[0m
GREEN=\033[0;32m
BGREEN=\033[1;32m
YELLOW=\033[0;33m
CYAN=\033[0;36m
RED=\033[0;31m

# Config
BREAK=\n

# Default action
.DEFAULT_GOAL := help

# Checks if the docker-compose command is available in the system
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)

# If Docker-Compose is available, use it, otherwise it uses docker compose
ifeq ($(strip $(DOCKER_COMPOSE)),)
	DOCKER_COMPOSE := docker compose
else
	DOCKER_COMPOSE := docker-compose
endif

## General commands:
.PHONY: help
help: ## Display this message help
	@awk '\
		BEGIN {\
			FS = ":.*##";\
			printf "${BREAK}${YELLOW}Usage:${BREAK}${CYAN}  make [target]${BREAK}${BREAK}${YELLOW}Available targets:${BREAK}${BREAK}" \
		} /^##/ { \
			printf "${YELLOW}%s${NOCOLOR}${BREAK}", substr($$0, 4) \
		} /^[a-zA-Z0-9_-]+:.*?##/ { \
			printf "  ${BGREEN}%-18s${NOCOLOR} %s${BREAK}", $$1, $$2 \
		}' $(MAKEFILE_LIST)
		@printf "${BREAK}${YELLOW}Example:${BREAK}${CYAN}  make up${BREAK}"

.PHONY: build
build: ## Build all container
	@echo ""
	@echo "${YELLOW}Build all container${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) up --build -d

.PHONY: rebuild
rebuild: destroy build ## Destroy and Rebuild all container

.PHONY: up
up: ## Start all container in detached mode
	@echo ""
	@echo "${YELLOW}Start all container${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) up -d;

.PHONY: stop
stop: ## Stop all container
	@echo ""
	@echo "${YELLOW}Stop all container${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) stop

.PHONY: restart
restart: stop up ## Restart all container

.PHONY: destroy
destroy: ## Destroy all container
	@echo ""
	@echo "${RED}Warning: This will destroy all container and data${NOCOLOR}"
	@echo "${YELLOW}Destroy all container${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) down --remove-orphans -v

.PHONY: logs
logs: ## See LOG in main service container
	@echo ""
	@echo "${YELLOW}Log in service container${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) logs -f SERVICE_NAME

## Databases commands:
# Adicionar apenas se o projeto tiver DB e scripts de dump/restore

## Stack commands:
# Adicionar bash, lint, test conforme stack do projeto

# Ignore make target errors for commands like `make backend bash`
.PHONY: %
%:
	@:
```

## Padrões por tipo de target

### Target composto

```makefile
.PHONY: rebuild
rebuild: destroy build ## Destroy and Rebuild all container
```

### Profile Docker Compose

```makefile
.PHONY: worker-up
worker-up: ## Start worker container (profile: worker)
	$(DOCKER_COMPOSE) --profile worker up -d worker
```

### Exec com variáveis de ambiente

```makefile
.PHONY: dump-db
dump-db: ## Dump database to backups/
	@$(DOCKER_COMPOSE) exec -e DB_HOST=$$DB_HOST \
		db sh -c 'pg_dump -U $(POSTGRES_USER) $(POSTGRES_DB) > /backups/dump.sql'
```

### Restore via pipe

```makefile
.PHONY: restore-db
restore-db: ## Restore dump to local database
	@cat ./backups/dump.sql | $(DOCKER_COMPOSE) exec -T db \
		psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)
```

### Git sync (opcional)

```makefile
.PHONY: sync-master
sync-master: ## Switch to master, pull latest and prune old branches
	@echo "${YELLOW}Switching to master branch${NOCOLOR}"
	@git checkout master
	@git pull; git branch | grep -vE "(^\*|master|main|develop)" | xargs -r git branch -d
	@echo "${GREEN}Master branch is up-to-date!${NOCOLOR}"
```

## Adaptação para este projeto (restaurant)

Serviços em `docker-compose.yml`: `db`, `backend`, `frontend`.

Seções sugeridas além de General:

```makefile
## Backend commands:
.PHONY: backend-bash
backend-bash: ## Open bash in backend container
	$(DOCKER_COMPOSE) exec backend bash

## Frontend commands:
.PHONY: frontend-bash
frontend-bash: ## Open bash in frontend container
	$(DOCKER_COMPOSE) exec frontend bash

## Databases commands:
.PHONY: db-shell
db-shell: ## Open psql shell
	$(DOCKER_COMPOSE) exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)
```

Substituir `SERVICE_NAME` em `logs` por `backend` (serviço principal) ou criar `logs-backend`, `logs-frontend`.

## Help awk — como funciona

- Linhas `## Section:` → cabeçalhos amarelos no help
- Linhas `target: ## description` → entradas verdes com alinhamento de 18 chars
- Targets sem `##` não aparecem no help (úteis para targets internos)

## Armadilhas comuns

| Problema | Solução |
|----------|---------|
| `$` consumido pelo Make | Usar `$$` em scripts shell |
| Tab vs espaços | Receitas exigem tab literal |
| `include .env` falha | Garantir bootstrap antes do include |
| Comentário `#` em valor .env | `sed 's/=.*//'` pode falhar — documentar no README |
| `docker compose` vs `docker-compose` | Usar detecção automática do template |
