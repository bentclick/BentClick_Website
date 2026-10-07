# Varredura de segurança — BentClick — 2026-10-07

Base: `9cba0fc` (Fase 12) → correções no commit seguinte · 24 rotas de API + 12 arquivos de Server Actions · 1 bucket R2 privado · frentes A–H

**Estado:** os 6 achados médios e os baixos 7–11 e 16 estão corrigidos e provados. Seguem abertos só os baixos 12 (em parte), 13, 14 e 15 — ver "Por onde seguir".

## Resumo

Nenhuma falha crítica: ninguém de fora entra no painel, e um fotógrafo não enxerga nem altera dado de outro (todas as consultas filtram pelo dono). O bucket é privado e os segredos estão fora do repositório. O ponto fraco está na **galeria pública**: a senha da galeria pode ser adivinhada com paciência, alguns limites somem quando o visitante apaga o cookie, e desligar o download não corta um ZIP já gerado. Também o **login do painel** não tem limite de tentativas que funcione na Vercel, nem 2FA.

| Rotas/ações auditadas | Achados confirmados | Críticos | Altos | Médios | Baixos | Dependências com falha alcançável |
|---|---|---|---|---|---|---|
| 36 | 16 | 0 | 0 | 6 | 10 | 0 |

## Contenção já feita
Nenhuma necessária — não há dado exposto agora.

## Achados

### [MÉDIA] 1. A senha da galeria pode ser adivinhada aos poucos
- **Quem consegue:** qualquer pessoa com o link de uma galeria protegida.
- **Como:** tentativas repetidas de senha. O limite é 5 a cada 15 min **por visitante (IP)**; não há teto por galeria, e a senha mínima é de 4 caracteres (um PIN de 4 dígitos cai em ~3 semanas a partir de um IP, bem mais rápido com vários IPs).
- **O que vaza:** todas as fotos da galeria.
- **Por que acontecia:** `src/services/public-gallery/public-gallery.service.ts:136` (chave só por IP) · `src/lib/validation/collection-settings.ts:35` (`min(4)`).
- **Correção proposta:** segundo limite por galeria (ex.: 30 erros/hora), senha mínima maior, IP lido do cabeçalho confiável da Vercel.

### [MÉDIA] 2. O login do painel não tem limite de tentativas que funcione, e não há 2FA
- **Quem consegue:** anônimo, conhecendo o e-mail do fotógrafo.
- **Como:** muitas tentativas de senha no login. O limite do Better Auth está em memória — cada instância da Vercel conta do zero.
- **O que vaza:** o painel inteiro, incluindo os originais.
- **Por que acontecia:** `src/lib/auth/auth.ts:24` (`rateLimit` sem `storage`).
- **Correção proposta:** limite guardado no Postgres; 2FA por app autenticador (decisão sua).

### [MÉDIA] 3. Apagar o cookie zera os limites de favoritos e de ZIP
- **Quem consegue:** anônimo, numa galeria aberta com favoritos e download completo.
- **Como:** sem cookie, cada favorito cria uma sessão nova; o limite é contado por sessão. Com conjuntos diferentes de favoritas, cada pedido monta um ZIP novo dos originais.
- **O que muda:** linhas sem fim no banco e ZIPs sem fim no R2 e na Vercel — custo seu.
- **Por que acontecia:** `src/services/favorites/favorites.service.ts:38-39` (sessão criada antes do limite, limite por sessão) · `src/services/downloads/visitor-download.service.ts:57` (ZIP por sessão).
- **Correção proposta:** limite por IP antes de criar sessão; teto de ZIPs de favoritas por galeria por hora.

### [MÉDIA] 4. Desligar o download não corta um ZIP já gerado
- **Quem consegue:** um visitante que pediu o ZIP enquanto o download estava ligado (ou em qualidade original).
- **Como:** reabrindo o link do ZIP depois que você desligou o download ou baixou a qualidade para "web".
- **O que vaza:** os originais, por até 72 h.
- **Por que acontecia:** `src/services/downloads/visitor-download.service.ts:70-78` só confere o acesso à galeria, não a permissão nem a qualidade atuais.
- **Correção proposta:** reconferir `allowFullDownload`/favoritos e a qualidade a cada pedido.

### [MÉDIA] 5. "Enviar seleção" não tem limite
- **Quem consegue:** anônimo com uma favorita marcada.
- **Como:** enviando a seleção repetidamente, com nome e e-mail inventados.
- **O que muda:** sua caixa de entrada inundada e a cota do Resend consumida; notificações com nome falso de cliente.
- **Por que acontecia:** `src/services/favorites/favorites.service.ts:84-101` sem `enforceRateLimit`.
- **Correção proposta:** limite por sessão e por IP; um envio por sessão a cada X minutos.

### [MÉDIA] 6. "Pedir nome e e-mail do cliente" não faz nada
- **Quem consegue:** qualquer visitante.
- **Como:** a opção é salva, mas nenhuma tela nem serviço a usa — favoritar e baixar seguem sem identificação.
- **Por que acontecia:** `requireIdentity` só chega ao tipo (`src/types/public-gallery.ts:24`); nada o confere.
- **Correção proposta:** pedir nome/e-mail antes do primeiro favorito/download e recusar no servidor quem não informou.

### [BAIXA] 7. O link "Site" da página de contato aceita endereço que não é http(s)
Só você edita esse campo; o React bloqueia `javascript:`, mas `data:` passa. `src/lib/validation/site-content.ts:66`, `src/lib/validation/settings.ts:4`, `src/app/(public)/contact/page.tsx:18`. Correção: aceitar só `http://`/`https://`.

### [BAIXA] 8. Segredo de reserva "dev"
Se `GALLERY_TOKEN_SECRET` faltasse em produção, o hash do IP dos visitantes usaria uma chave pública. `public-gallery.service.ts:107`, `visitor-download.service.ts:18`. Correção: falhar sem a variável.

### [BAIXA] 9. Cabeçalhos do navegador incompletos
Sem CSP, `X-Powered-By: Next.js` exposto; HSTS depende da Vercel. `next.config.ts`. Correção: `poweredByHeader: false`, HSTS explícito, CSP em modo relatório primeiro.

### [BAIXA] 10. Imagem "bomba" pode estourar a memória do processamento
Sem `limitInputPixels` explícito; o logo da marca d'água confia no tipo declarado. `src/lib/images/derivatives.ts`, `src/services/watermarks/watermark.service.ts:50`. Só quem está logado envia.

### [BAIXA] 11. Otimizador de imagem ligado sem uso
`next.config.ts:12` libera `*.r2.cloudflarestorage.com` para `/_next/image`, que o app não usa — custo por abuso. Correção: remover.

### [BAIXA] 12. Galeria expirada revela que existe
Mostra o nome do estúdio mesmo com senha, e a tela de senha ainda responde "senha incorreta". `access-rules.ts:24-28`, `public-gallery.service.ts:130-141`.

### [BAIXA] 13. Prévias já abertas seguem válidas por até 12 h após revogar o link
`src/lib/r2/signed-urls.ts:6`. Só prévias (com marca d'água, se houver), nunca originais.

### [BAIXA] 14. Consultar o andamento do ZIP dispara trabalho sem limite
`src/app/g/[publicSlug]/api/archives/[jobId]/route.ts:14`. O trabalho não se repete (trava atômica), só gasta invocação.

### [BAIXA] 15. Cota de armazenamento pode ser ultrapassada com envios em paralelo
`upload.service.ts:50-72`. Só o próprio dono.

### [BAIXA] 16. Defeito: ZIP de favoritas reaproveitado entre sessões dá "não encontrado"
`archive.repository.ts:30-36` ignora a sessão ao reaproveitar. Não vaza nada, mas quebra o download.

### Condicional — só se o cadastro estiver aberto (`ALLOW_SIGNUP=true`)
Um estranho criaria conta e teria 100 GB de R2 e envio de e-mail pelo seu domínio (30/h por conta, com nome de exibição livre — risco de phishing com a sua reputação). O servidor bloqueia o cadastro quando a variável é `false`; o `.env.example` vem com `true`.

## Correções e prova

| # | Correção | Prova (antes → depois) |
|---|---|---|
| 1 | Teto de 20 senhas erradas por galeria/hora (bloqueia até 1 h, vale contra quem troca de IP); 5 por IP/15 min; IP lido do cabeçalho da Vercel; senha nova com 8+ caracteres, número e caractere especial, e botão "Gerar senha" | 20 erros de IPs diferentes e depois a senha certa: **entrava** → **GALLERY_LOCKED** |
| 2 | Limite do login guardado no Postgres (5/min por IP no login, 2FA e reset) + 15 tentativas/15 min por conta; 2FA por aplicativo autenticador com códigos de reserva; "Esqueci minha senha" por e-mail (link de 30 min, uso único, desconecta os outros aparelhos) | 7 senhas erradas: `401×5, 429×2`, contador na tabela `auth_rate_limit`. 2FA ponta a ponta: sem o código não há sessão; código errado 401; certo 200 |
| 3 | Limite de sessões novas por IP (30/h) e por galeria (500/h); favoritos e ZIP também limitados por IP; teto de 30 ZIPs de favoritas por galeria/hora | 40 favoritos sem cookie: **todos aceitos** → **31º recusado** (outro visitante segue normal) |
| 4 | O ZIP reconfere a cada pedido: download completo ligado, mesma qualidade, favoritos ligados | ZIP original após baixar para "web" e desligar: **servido** → **DOWNLOAD_DISABLED** |
| 5 | Envio de seleção: 5/h por IP e atômico; a seleção **fecha** após enviada; só o fotógrafo reabre ("Reabrir seleção"; "Limpar" também reabre) | 6 envios seguidos: **6 e-mails** → **1**; favoritar após enviar: **aceito** → **SELECTION_CLOSED** |
| 6 | "Pedir nome e e-mail" vale no servidor para favoritar e baixar; a galeria pede os dados antes | Favoritar sem identificação: **aceito** → **IDENTITY_REQUIRED**; após informar, aceito |
| 7 | Link "Site" só http(s), na gravação e na exibição | `javascript:` recusado pelo schema |
| 8 | Sem segredo de reserva "dev": falta do `GALLERY_TOKEN_SECRET` → erro | — |
| 9 | HSTS explícito, `X-Powered-By` removido | — |
| 10 | Limite de pixels no processamento; logo conferido pelo formato real (PNG/WebP) | — |
| 11 | Otimizador de imagem desligado | — |
| 16 | ZIP de favoritas só é reaproveitado pela mesma sessão | — |

A bateria de invasão fica em `src/services/public-gallery/gallery-abuse.int.test.ts` (banco local, dados descartáveis, cada ataque com controle negativo):

```bash
RUN_DB_TESTS=1 npx vitest run src/services/public-gallery/gallery-abuse.int.test.ts
```

## Descartados
| Suspeita | Por que não é falha |
|---|---|
| Um fotógrafo ver/alterar dado de outro | Toda consulta filtra por dono; ids de outro respondem 404 igual a inexistente |
| Página do painel buscar dado antes do login | Cada página confere a sessão antes de consultar |
| Upload em pasta de outro / chave vinda do navegador | Chaves geradas no servidor com prefixo do dono; tamanho e tipo assinados |
| Sessão de uma galeria valer em outra | Sessão presa à coleção e cookie preso ao caminho `/g/{slug}` |
| Foto de outra galeria pelo id | Consultas filtram coleção + status READY |
| Título da galeria no `<title>` antes da senha | Só com acesso liberado; senão "Galeria" |
| `?preview=1` liberar a galeria | Exige a sessão do próprio dono |
| Injeção de HTML em e-mail / cabeçalho | Tudo escapado; Resend por API JSON |
| SQL injection | Única consulta crua é parametrizada |
| CSV/ZIP com nome malicioso | Nomes saneados; exportação é texto simples |
| Webhook/cron forjados | Assinatura sobre o corpo cru em tempo constante; sem segredo → fecha |
| Cadastro aberto com `ALLOW_SIGNUP=false` | Bloqueado na API, não só na tela |

## O que foi verificado e está sólido
| Área | Situação | Por quê |
|---|---|---|
| Separação entre contas | OK | Escopo por `userId` em todas as rotas, ações e páginas |
| Armazenamento | OK | Bucket privado, sem fallback público; URLs assinadas (10 min download) |
| Sessão do painel | OK | Conferida no banco a cada pedido, sem cache; cookie HttpOnly/Lax/Secure; origem conferida |
| Sessão da galeria | OK | Token 256 bits guardado como hash; invalidada ao trocar link; senha com argon2id |
| Erros | OK | Mensagem de banco nunca vai ao navegador |
| Segredos | OK | Nada no repositório nem no histórico além do `.env.example`; nenhum segredo no bundle |
| Dados pessoais | OK | IP só como HMAC; logs sem token/senha |

## Dependências
`npm audit --omit=dev`: 7 avisos (2 críticos), **nenhum alcançável** — vêm do `vitest` (testes) e da CLI do Prisma (driver MySQL que nunca roda; só Postgres na migração). Ficam até as versões novas saírem sem quebra.

## Decisões do dono (2026-10-07)
1. **Cadastro:** `ALLOW_SIGNUP=false` em produção (confirmado).
2. **2FA no painel:** sim — por aplicativo autenticador. Ative em Configurações → Verificação em duas etapas.
3. **Senha da galeria:** 8+ caracteres com número e caractere especial (vale para senhas novas; as atuais continuam valendo até serem trocadas); bloqueio da galeria após 20 erros/hora.
4. **Seleção:** fecha depois de enviada; sem limite de fotos.
5. **Recuperar senha do painel:** sim, por e-mail.
6. **CSP:** pendente — a explicar ao dono.

## O que esta varredura não cobre
- Painéis de Vercel, Cloudflare, Prisma, Resend, Registro.br e GitHub: quem tem acesso, variáveis por ambiente, preview usando o banco de produção.
- Backup do banco: existe e já foi restaurado alguma vez?
- Ataque real em produção (só análise de código; nada foi testado contra o site no ar).
- Código que entrar depois de hoje; engenharia social.

## Por onde seguir
| Prioridade | Ação | Esforço |
|---|---|---|
| 1 | Ativar o 2FA na conta do painel em produção | 2 min |
| 2 | Trocar as senhas de galeria antigas (4–7 caracteres) pela regra nova | por galeria |
| 3 | CSP em modo relatório (achado 9) | médio |
| 4 | Baixos abertos: 12 (galeria expirada mostra o nome do estúdio), 13 (prévias valem 12 h após revogar), 14 (consulta do ZIP sem limite), 15 (cota em envios paralelos) | pequeno cada |
| 5 | Repetir `npm audit --omit=dev` e esta bateria a cada 1–2 meses ou após uma leva grande de rotas | — |

## Como foi feito
Varredura estática por quatro auditores em paralelo (rotas do painel; superfície pública e regras; login, armazenamento e segredos; entradas e navegador), cada achado conferido por mim no código. Histórico do git verificado. Nenhum teste contra produção.
