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
BACKUPS_DIR = backups

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

## Comandos gerais:
.PHONY: help
help: ## Exibe esta mensagem de ajuda
	@awk '\
		BEGIN {\
			FS = ":.*##";\
			printf "${BREAK}${YELLOW}Uso:${BREAK}${CYAN}  make [target]${BREAK}${BREAK}${YELLOW}Targets disponíveis:${BREAK}${BREAK}" \
		} /^##/ { \
			printf "${YELLOW}%s${NOCOLOR}${BREAK}", substr($$0, 4) \
		} /^[a-zA-Z0-9_-]+:.*?##/ { \
			printf "  ${BGREEN}%-18s${NOCOLOR} %s${BREAK}", $$1, $$2 \
		}' $(MAKEFILE_LIST)
	@printf "${BREAK}${YELLOW}Exemplo:${BREAK}${CYAN}  make up${BREAK}"

.PHONY: build
build: ## Build e inicia todos os containers
	@echo ""
	@echo "${YELLOW}Build e inicia todos os containers${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) up --build -d

.PHONY: rebuild
rebuild: destroy build ## Destrói e reconstrói todos os containers

.PHONY: up
up: ## Inicia todos os containers em modo detached
	@echo ""
	@echo "${YELLOW}Inicia todos os containers${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) up -d

.PHONY: stop
stop: ## Para todos os containers
	@echo ""
	@echo "${YELLOW}Para todos os containers${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) stop

.PHONY: restart
restart: stop up ## Reinicia todos os containers

.PHONY: destroy
destroy: ## Remove todos os containers e volumes
	@echo ""
	@echo "${RED}Atenção: isso irá destruir todos os containers e dados${NOCOLOR}"
	@echo "${YELLOW}Remove todos os containers${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) down --remove-orphans -v

.PHONY: ps
ps: ## Lista o status dos containers
	$(DOCKER_COMPOSE) ps

.PHONY: logs
logs: ## Acompanha logs do backend
	@echo ""
	@echo "${YELLOW}Logs do backend${NOCOLOR}"
	@echo ""
	$(DOCKER_COMPOSE) logs -f backend

.PHONY: logs-backend
logs-backend: ## Acompanha logs do backend
	$(DOCKER_COMPOSE) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## Acompanha logs do frontend
	$(DOCKER_COMPOSE) logs -f frontend

.PHONY: logs-db
logs-db: ## Acompanha logs do banco de dados
	$(DOCKER_COMPOSE) logs -f db

.PHONY: health
health: ## Verifica o health check do backend
	@curl -sf http://localhost:$(BACKEND_PORT)/api/health | python3 -m json.tool || \
		echo "${RED}Backend indisponível em http://localhost:$(BACKEND_PORT)/api/health${NOCOLOR}"

## Banco de dados:
.PHONY: db-shell
db-shell: ## Abre shell psql no PostgreSQL
	$(DOCKER_COMPOSE) exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

.PHONY: dump-db
dump-db: ## Exporta dump do banco para backups/dump.sql
	@mkdir -p $(BACKUPS_DIR)
	@echo ""
	@echo "${YELLOW}Exportando banco para $(BACKUPS_DIR)/dump.sql${NOCOLOR}"
	@echo ""
	@$(DOCKER_COMPOSE) exec -T db pg_dump -U $(POSTGRES_USER) $(POSTGRES_DB) > $(BACKUPS_DIR)/dump.sql
	@echo "${GREEN}Dump salvo em $(BACKUPS_DIR)/dump.sql${NOCOLOR}"

.PHONY: restore-db
restore-db: ## Restaura dump de backups/dump.sql no banco
	@if [ ! -f $(BACKUPS_DIR)/dump.sql ]; then \
		echo "${RED}Arquivo $(BACKUPS_DIR)/dump.sql não encontrado${NOCOLOR}"; \
		exit 1; \
	fi
	@echo ""
	@echo "${YELLOW}Restaurando banco a partir de $(BACKUPS_DIR)/dump.sql${NOCOLOR}"
	@echo ""
	@cat $(BACKUPS_DIR)/dump.sql | $(DOCKER_COMPOSE) exec -T db \
		psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)
	@echo "${GREEN}Banco restaurado com sucesso${NOCOLOR}"

## Backend:
.PHONY: backend-bash
backend-bash: ## Abre bash no container do backend
	$(DOCKER_COMPOSE) exec backend bash

## Frontend:
.PHONY: frontend-bash
frontend-bash: ## Abre sh no container do frontend
	$(DOCKER_COMPOSE) exec frontend sh

.PHONY: frontend-install
frontend-install: ## Instala dependências npm no container do frontend
	$(DOCKER_COMPOSE) exec frontend npm install

.PHONY: seed-sales
seed-sales: ## Popula vendas fake do dia (cole no console do browser)
	@echo ""
	@echo "${YELLOW}Seed de vendas fake — relatório/gráfico do dia${NOCOLOR}"
	@echo ""
	@echo "1. Abra ${CYAN}http://localhost:$(FRONTEND_PORT)${NOCOLOR}"
	@echo "2. DevTools → Console (F12)"
	@echo "3. Cole e execute:"
	@echo ""
	@echo "${CYAN}fetch('/scripts/seed-daily-sales.js').then(r=>r.text()).then(eval)${NOCOLOR}"
	@echo ""
	@echo "Ou copie o arquivo: ${CYAN}frontend/public/scripts/seed-daily-sales.js${NOCOLOR}"
	@echo ""

.PHONY: frontend-lint
frontend-lint: ## Executa ESLint no frontend
	$(DOCKER_COMPOSE) exec frontend npm run lint

# Ignore make target errors for commands like `make backend bash`
.PHONY: %
%:
	@:
