# TopFinds

Vitrine de ofertas com links de afiliado. Os visitantes navegam pelos produtos por categoria e subcategoria, e os administradores gerenciam tudo por um painel: cadastro e importação de produtos (inclusive a partir de links do Mercado Livre), categorias, subcategorias, usuários e estatísticas.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + React Router
- **Backend:** Express (TypeScript, executado com `tsx`) com autenticação JWT
- **Banco de dados:** Supabase (PostgreSQL)

## Estrutura

```
server.ts             API Express + servidor do frontend
src/                  App React (páginas, componentes e tipos)
supabase_schema.sql   Script para criar as tabelas no Supabase
seed_categories.ts    Script opcional para popular categorias
railway.json          Configuração de deploy no Railway
```

## Rodando localmente

Pré-requisito: Node.js 20 ou superior e um projeto no Supabase.

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie as tabelas executando o conteúdo de `supabase_schema.sql` no SQL Editor do Supabase.
3. Copie o arquivo de exemplo e preencha as variáveis:
   ```bash
   cp .env.example .env
   ```
4. Inicie o servidor (API + frontend com Vite em modo desenvolvimento):
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`.

Para ter acesso ao painel (`/admin`), cadastre um usuário pelo site e marque `is_admin = 1` na tabela `users` do Supabase. Depois disso, outros administradores podem ser promovidos pelo próprio painel.

## Variáveis de ambiente

Todas estão listadas no [`.env.example`](.env.example). O servidor **não inicia** se alguma obrigatória estiver faltando.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SUPABASE_URL` | Sim | URL do projeto no Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave `service_role` do Supabase (usada só no servidor, nunca exponha no frontend) |
| `JWT_SECRET` | Sim | Segredo usado para assinar os tokens de login. Use um valor longo e aleatório |
| `PORT` | Não | Porta do servidor (padrão `3000`) |
| `NODE_ENV` | Não | Use `production` para servir o build da pasta `dist/` |

Nunca commite o arquivo `.env` — ele já está no `.gitignore`.

## Build de produção

```bash
npm run build                    # gera o frontend em dist/
NODE_ENV=production npm start    # API + arquivos estáticos de dist/
```

## Deploy no Railway

1. Crie um projeto no [Railway](https://railway.app) a partir deste repositório do GitHub.
2. Em **Variables**, cadastre `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` e `NODE_ENV=production`. O Railway define a `PORT` automaticamente.
3. O Railway usa o `railway.json`: build com Nixpacks (que roda `npm run build`) e início com `npm run start`, reiniciando em caso de falha.
4. Em **Settings → Networking**, gere um domínio público para acessar o site.
