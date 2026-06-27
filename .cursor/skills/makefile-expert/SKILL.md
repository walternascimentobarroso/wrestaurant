---
name: makefile-expert
description: >-
  Especialista em Makefile para projetos Docker. Analisa a estrutura do projeto
  (docker-compose, serviços, .env, stack) e gera ou refatora um Makefile completo
  com help colorido, bootstrap de .env e targets organizados por seção. Use quando
  o usuário pedir Makefile, make targets, automação de Docker, ou mencionar
  Exemplo-Makefile.
---

# Makefile Expert

Gera Makefiles de qualidade para projetos Docker, seguindo o padrão do [reference.md](reference.md) (baseado em `Exemplo-Makefile` na raiz do projeto).

## Quando aplicar

- Criar `Makefile` do zero
- Refatorar ou expandir Makefile existente
- Adicionar targets para novos serviços/comandos
- Padronizar automação Docker do projeto

## Workflow de análise

Antes de escrever, inspecione o projeto nesta ordem:

```
Análise do projeto:
- [ ] docker-compose.yml (ou compose.yaml) — serviços, profiles, volumes, healthchecks
- [ ] .env.example — variáveis e nomes de containers/DB
- [ ] Makefile existente (se houver) — preservar targets úteis
- [ ] Stack por serviço: package.json, requirements.txt, pyproject.toml, composer.json, etc.
- [ ] Scripts em scripts/, .docker/, dumpTools/ ou similares
- [ ] Ferramentas de lint/test (ruff, eslint, phpcs, phpstan, pytest, etc.)
- [ ] README ou docs com comandos manuais frequentes
```

Extraia de cada serviço Docker:
- Nome do container (ex: `backend`, `frontend`, `db`)
- Comando de shell padrão (`bash`, `sh`)
- Portas expostas
- Profiles (`--profile sftp`)
- Volumes de backup/dados

## Estrutura obrigatória do Makefile

Sempre incluir, nesta ordem:

1. **Bootstrap `.env`** — copiar `.env.example` se `.env` não existir
2. **Load env** — `include .env` + `export $(shell sed 's/=.*//' .env)`
3. **Cores** — `NOCOLOR`, `GREEN`, `BGREEN`, `YELLOW`, `CYAN`, `RED`
4. **Config** — `BREAK=\n`, `.DEFAULT_GOAL := help`
5. **Docker Compose** — detectar `docker-compose` vs `docker compose`
6. **help** — target com `awk` e comentários `##`
7. **Targets por seção** — cabeçalhos `## Nome da seção:`
8. **Catch-all** — `.PHONY: %` + `%: @:` para `make service comando`

Ver template completo em [reference.md](reference.md).

## Convenções de targets

### Seção "General commands" (sempre)

| Target | Descrição | Comando base |
|--------|-----------|--------------|
| `help` | Help colorido | awk sobre `##` |
| `build` | Build + start detached | `up --build -d` |
| `rebuild` | destroy + build | composto |
| `up` | Start detached | `up -d` |
| `stop` | Parar containers | `stop` |
| `restart` | stop + up | composto |
| `destroy` | down com aviso vermelho | `down --remove-orphans -v` |
| `logs` | Logs do serviço principal | `logs -f <service>` |

### Seções adicionais (conforme projeto)

Gerar seções apenas quando o projeto tiver o recurso:

- `## Databases commands:` — dump/restore se houver scripts ou Postgres/MySQL
- `## Git commands:` — sync-master, branch cleanup (se pedido ou padrão do time)
- `## <Stack> commands:` — um bloco por runtime (Python, Node, PHP, etc.)
- `## <Service> commands:` — profiles isolados (sftp, worker, redis-cli)

### Nomenclatura

- Targets: `kebab-case` ou `camelCase` conforme o exemplo do projeto
- Comentários help: `target: ## Descrição curta em inglês ou idioma do projeto`
- Seções: `## Section name:` (com dois-pontos no final)
- Prefixo por serviço opcional: `backend-bash`, `frontend-logs`, `db-shell`

### Mensagens de echo

Padrão para ações visíveis:

```makefile
@echo ""
@echo "${YELLOW}Mensagem descritiva${NOCOLOR}"
@echo ""
```

Destrutivas usam `${RED}` no aviso antes da ação.

## Targets derivados da stack

Mapear ferramentas encontradas no projeto:

| Stack | Targets típicos |
|-------|-----------------|
| FastAPI/Python | `bash`, `test`, `lint` (ruff), `migrate`, `shell` |
| Next.js/Node | `bash`, `lint`, `test`, `build-frontend` |
| PHP | `phpcs`, `phpcbf`, `phpstan` (em staged files via git diff) |
| PostgreSQL | `db-shell`, `dump-db`, `restore-db` |
| Generic | `bash-<service>`, `logs-<service>`, `exec-<service>` |

Comandos dentro de container:

```makefile
$(DOCKER_COMPOSE) exec <service> <comando>
```

Comandos com variáveis do `.env`:

```makefile
$(DOCKER_COMPOSE) exec -e VAR=$$VAR_FROM_ENV service sh -c '...'
```

Lint em arquivos staged (padrão PHP do exemplo):

```makefile
@FILES=$$(git diff --cached --name-only --diff-filter=AM | grep '\.ext$$'); \
if [ -z "$$FILES" ]; then \
	echo "No staged files."; \
else \
	$(DOCKER_COMPOSE) exec service tool $$FILES; \
fi
```

## Regras de qualidade

- Todo target público: `.PHONY`
- Targets compostos: `restart: stop up` com `##` só no último ou no composto
- Não inventar serviços — usar nomes exatos do `docker-compose.yml`
- Variáveis `.env` referenciadas como `$(NOME)` após `include`
- Escapar `$` em shell: `$$` no Makefile
- Tab real (não espaços) nas receitas
- Manter catch-all `%` no final para delegar comandos arbitrários
- Idioma das mensagens `##`: consistente com o projeto (PT ou EN)

## Checklist antes de entregar

```
- [ ] make help lista todas as seções e targets
- [ ] .env é criado automaticamente se ausente
- [ ] DOCKER_COMPOSE funciona em ambos os formatos
- [ ] destroy exibe aviso antes de remover volumes
- [ ] Nomes de serviços batem com docker-compose.yml
- [ ] Nenhum target referencia container inexistente
- [ ] Catch-all % no final do arquivo
```

## Entrega

1. Escrever ou atualizar `Makefile` na raiz do projeto (mesmo nível que `docker-compose.yml`)
2. Resumir seções e targets criados
3. Sugerir `make help` para validar

Para o template base completo, leia [reference.md](reference.md).
