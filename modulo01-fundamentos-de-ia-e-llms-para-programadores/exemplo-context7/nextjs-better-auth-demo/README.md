# Next.js + Better Auth Demo

Demo simples de autenticação com GitHub OAuth usando Next.js App Router, Better Auth e SQLite.

## Pré-requisitos

- Node.js 18+
- Conta no GitHub para criar um OAuth App

## Configuração do GitHub OAuth App

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em **New OAuth App**
3. Preencha:
   - **Application name**: `nextjs-better-auth-demo`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copie o **Client ID** e gere um **Client Secret**

## Configuração do ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
BETTER_AUTH_SECRET=sua-chave-secreta-aleatoria-longa
GITHUB_CLIENT_ID=seu-github-client-id
GITHUB_CLIENT_SECRET=seu-github-client-secret
```

> **Dica**: gere o `BETTER_AUTH_SECRET` com `openssl rand -hex 32`

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Gerar tabelas do banco SQLite
npx @better-auth/cli migrate

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura do projeto

```
nextjs-better-auth-demo/
├── app/
│   ├── api/auth/[...all]/route.ts   # Handler do Better Auth
│   ├── login/page.tsx               # Página de login
│   ├── page.tsx                     # Página home
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── auth.ts                      # Configuração do Better Auth (servidor)
│   └── auth-client.ts               # Auth client (cliente)
├── .env.local                       # Variáveis de ambiente (não comitar)
└── better-auth.sqlite               # Banco de dados SQLite (gerado pelo migrate)
```

## Funcionalidades

- **Home (`/`)**: mostra "Logado como `<email>`" ou "Você não está logado"
- **Login (`/login`)**: botão "Entrar com GitHub" com ícone SVG
- **Logout**: botão "Sair" na home encerra a sessão
