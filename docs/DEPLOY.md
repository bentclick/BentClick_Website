# Deploy — Prisma Postgres · Vercel · Cloudflare

Ordem recomendada: **1 Banco → 2 Vercel → 3 Domínio (Cloudflare + Registro.br) → 4 Primeiro acesso → 5 R2**.
O banco vem antes do primeiro deploy porque o build aplica as migrações e as páginas públicas leem o banco durante o build.

---

## 1. Banco de dados — Prisma Postgres

1. Acesse **console.prisma.io** → **New project** → nome `bentclick` → região **mais próxima de São Paulo** disponível (ex.: `us-east-1` se não houver América do Sul).
   - Alternativa: na Vercel, **Storage → Create Database → Prisma Postgres**, que já injeta a variável no projeto.
2. Em **Connect to your database**, gere a **connection string direta** (formato `postgres://…@db.prisma.io:5432/…?sslmode=require`).
3. Guarde essa URL: ela será usada em **`DATABASE_URL` e `DIRECT_URL`** (a mesma nas duas).

> O app usa o driver `pg` padrão (Prisma 7 + `@prisma/adapter-pg`), então qualquer Postgres funciona. Trocar de provedor depois é só trocar a URL e migrar os dados.

---

## 2. Vercel

### 2.1 Importar o projeto
1. **Add New → Project** → importe `bentclick/BentClick_Website`.
2. Framework: **Next.js** (detectado).
3. **Build Command** → *Override* → `npm run vercel-build`
   (gera o Prisma Client, aplica `prisma migrate deploy` e faz o build).
4. Node.js: 22.x ou superior (Settings → General).

### 2.2 Variáveis de ambiente (Settings → Environment Variables → Production e Preview)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL do Prisma Postgres (passo 1) |
| `DIRECT_URL` | a mesma URL |
| `NEXT_PUBLIC_APP_URL` | `https://bentclick.com.br` |
| `BETTER_AUTH_URL` | `https://bentclick.com.br` |
| `BETTER_AUTH_SECRET` | segredo novo* |
| `GALLERY_TOKEN_SECRET` | segredo novo* |
| `CRON_SECRET` | segredo novo* |
| `ALLOW_SIGNUP` | `true` (só até criar sua conta — ver passo 4) |
| `RESEND_API_KEY` | chave do Resend |
| `EMAIL_FROM` | `BentClick <galerias@bentclick.com.br>` |
| `RESEND_WEBHOOK_SECRET` | *Signing secret* do webhook do Resend (ver “E-mail”) |

\* Gere cada um separadamente — **não reutilize os do `.env` local**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Variáveis do R2 e do Resend podem ficar para depois (fases 3 e 9).

### 2.3 Deploy
**Deploy**. No log do build deve aparecer `prisma migrate deploy` aplicando `…_init` e `…_brand_categories`.
Teste primeiro no endereço `*.vercel.app` que a Vercel gera.

### 2.4 Plano
O plano **Hobby** serve para testes, mas os termos da Vercel não permitem uso comercial nele. Para atender clientes, use o **Pro**.

---

## 3. Domínio `bentclick.com.br` — Cloudflare (DNS) + Registro.br

O DNS fica no Cloudflare porque o R2 vai usar um subdomínio do mesmo domínio (`media.bentclick.com.br`).

### 3.1 Cloudflare
1. **Add a domain** → `bentclick.com.br` → plano **Free**.
2. O Cloudflare mostra **dois nameservers** (ex.: `xxx.ns.cloudflare.com`). Anote.
3. Se ele importar registros antigos (A/CNAME de outro serviço), apague os do `@` e `www`.

### 3.2 Registro.br
1. registro.br → **Domínios → bentclick.com.br → DNS → Alterar servidores DNS**.
2. Cole os **dois nameservers do Cloudflare** e salve.
3. A propagação leva de minutos a algumas horas. O Cloudflare avisa por e-mail quando o domínio ficar **Active**.

### 3.3 Vercel → domínio
1. Vercel → **Project → Settings → Domains** → adicione `bentclick.com.br`.
2. Adicione também `www.bentclick.com.br` e configure-o para **redirecionar para `bentclick.com.br`** (a autenticação usa um único endereço).
3. A Vercel mostra os registros exatos. Crie-os no Cloudflare (**DNS → Records**), normalmente:

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| A | `@` | o IP que a Vercel indicar | **DNS only (nuvem cinza)** |
| CNAME | `www` | o host que a Vercel indicar | **DNS only (nuvem cinza)** |

> Mantenha a **nuvem cinza**. Com a nuvem laranja, o proxy do Cloudflare conflita com o SSL da Vercel.

4. Aguarde a Vercel marcar os dois domínios como **Valid Configuration** (o certificado SSL é emitido automaticamente).

---

## 4. Primeiro acesso

1. Abra `https://bentclick.com.br/login` → **“Primeiro acesso? Configure seu estúdio”** → crie sua conta.
2. Na Vercel, mude **`ALLOW_SIGNUP` para `false`** → **Deployments → … → Redeploy**.
   Sem isso, qualquer pessoa consegue criar conta.
3. Teste: **Coleções → Nova coleção**, filtros, arquivar, duplicar.

---

## 5. Cloudflare R2 (preparar agora, usar a partir da fase 3 — envio de fotos)

1. Cloudflare → **R2 Object Storage** → ative (pede cartão; 10 GB/mês grátis, sem custo de saída).
2. **Create bucket** → `bentclick-media` → localização automática. **Não** habilite acesso público nem o domínio `r2.dev`.
3. **Manage R2 API Tokens → Create API token**:
   - Permissão: **Object Read & Write**
   - Escopo: **apenas o bucket `bentclick-media`**
   - Anote **Access Key ID**, **Secret Access Key** e o **Account ID** (aparece na página do R2).
4. Bucket → **Settings → CORS policy**:

```json
[
  {
    "AllowedOrigins": ["https://bentclick.com.br", "http://localhost:3100"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "content-length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Na Vercel, adicione: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=bentclick-media` → Redeploy.

---

## E-mail (Resend)
1. Resend → **Domains → Add** `bentclick.com.br` → crie no Registro.br os registros TXT/MX/CNAME que o Resend mostrar.
2. Na Vercel: `RESEND_API_KEY` e `EMAIL_FROM="BentClick <galerias@bentclick.com.br>"`.
3. Resend → **Webhooks → Add endpoint** `https://bentclick.com.br/api/webhooks/resend`, eventos `email.delivered`, `email.bounced`, `email.complained`, `email.failed` → copie o *Signing secret* (`whsec_…`) para `RESEND_WEBHOOK_SECRET` na Vercel e faça **Redeploy**.

## Tarefas agendadas (cron)
`vercel.json` agenda `/api/cron/expire` (03:00 UTC) e `/api/cron/cleanup` (03:30 UTC) uma vez por dia — o limite do plano Hobby. A Vercel envia `Authorization: Bearer $CRON_SECRET` automaticamente; basta a variável `CRON_SECRET` existir.

---

## Desenvolvimento local
Veja o [README](../README.md). O banco local roda em Docker (`127.0.0.1:55462`) e o app em `http://localhost:3100`.
