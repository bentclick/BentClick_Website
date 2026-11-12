# Varredura de segurança — 11/11/2026

- **Base:** `9978870` (HEAD). Delta desde a varredura anterior: `71b4704` (relatório de 07/10).
- **Método:** quatro frentes só de leitura em paralelo (A+H, B+D, C+F, E+G), mais a bateria de abuso da galeria rodada de novo no banco local: 6/6 passando.
- **Situação:** corrigido no mesmo dia, depois das decisões do dono (ver "Correções" no fim).

## Resumo

**Não foi achado nenhum caminho para alguém de fora ler foto de cliente.** Isso vale para o original, a prévia, a versão editada e o ZIP. Ficou confirmado no código:

- O bucket é privado e não existe URL pública alternativa.
- O link assinado só sai depois da checagem de acesso, feita a cada requisição.
- O recorte por dono está na consulta em listas, detalhes, downloads, ZIPs e favoritos.
- A senha, o link, a publicação, o prazo e as permissões de download são conferidos em toda rota da galeria.

Os pontos que merecem ação são:

- **a versão do Next.js**, que tem falhas conhecidas;
- **o login**, em que a sessão nunca expira enquanto é usada, o "confiar neste dispositivo" se renova sozinho e o 2FA não é obrigatório;
- **a marca d'água**, que pode não chegar à galeria do cliente.

## Achados

### Contenção imediata

| # | Sev. | O quê | Onde | Quem ataca | Efeito |
|---|---|---|---|---|---|
| G1 | ALTA | `next@16.3.8` está dentro de 3 alertas (>=16.0.0 <=16.4.0). O de **DoS em Server Actions** é alcançável: o formulário de contato e as ações da galeria funcionam sem login. Os dois de RCE (Image Optimization com SVG e `use cache`) **não** se aplicam: o app usa `images.unoptimized` e não usa `use cache`. | package.json | anônimo | site fora do ar ou custo na Vercel |

### Login e sessão (frente C)

| # | Sev. | O quê | Onde | Quem ataca | Efeito |
|---|---|---|---|---|---|
| C1 | MÉDIA | Sessão de 14 dias renovada a cada dia de uso. Não há prazo máximo nem expiração por inatividade. | src/lib/auth/auth.ts:39-42 | quem pega o cookie ou o computador aberto | fica dentro para sempre enquanto usar |
| C2 | MÉDIA | "Confiar neste dispositivo" pula o 2FA por 30 dias e se renova a cada login. Trocar a senha ou o 2FA não o revoga, e não há tela para remover. | two-factor-step.tsx:14; plugin twoFactor | dispositivo perdido ou emprestado + senha salva | entra sem 2FA indefinidamente |
| C3 | MÉDIA | O 2FA é opcional e o servidor não o exige. | src/lib/auth/session.ts | quem descobre a senha | painel inteiro, com os originais |
| C4 | MÉDIA (disponibilidade) | Com 15 tentativas por e-mail em 15 min, incluindo as certas, qualquer um bloqueia o seu login sabendo o seu e-mail. | auth.ts:61-69 | anônimo | você fica sem entrar |
| C5 | BAIXA | Ligar ou desligar o 2FA não derruba as outras sessões, e não há lista de sessões. | plugin twoFactor; two-factor-card.tsx | cookie roubado antes | segue dentro |
| C6 | BAIXA | `/two-factor/get-totp-uri` e `/generate-backup-codes` pedem só sessão + senha, sem "sessão recente" e sem limite por conta. | plugin twoFactor | cookie roubado + senha | leva o segredo do 2FA ou códigos novos |
| C7 | BAIXA | Um dispositivo com sessão revogada entra em loop de redirecionamento. Falha fechada; afeta só a experiência. | src/proxy.ts:20-22 | — | — |
| C8 | BAIXA | O pedido de redefinição de senha tem limite só por IP. | auth.ts:52 | anônimo com vários IPs | enche a sua caixa |
| C9 | BAIXA | A validação do `BETTER_AUTH_SECRET` (mínimo de 32 caracteres) nunca roda. | src/lib/env/server.ts:8 | — | segredo fraco passaria |
| C10 | BAIXA | Não há trava das rotas que o Better Auth monta (engano 4). | src/app/api/auth | — | atualização futura abre rota em silêncio |

### Fotos de cliente (frentes A, B, D, H)

| # | Sev. | O quê | Onde | Quem ataca | Efeito |
|---|---|---|---|---|---|
| D1 | MÉDIA | Ao pôr ou trocar a marca d'água, só o painel do fotógrafo, enquanto aberto, regera as prévias. Fechada a aba, a galeria segue mostrando a prévia de 2048 px **sem** a marca. | preview-refresh.service.ts:35-72 | visitante da galeria | cópia sem marca |
| A1 | BAIXA | Apagar uma foto não apaga os ZIPs já gerados com ela, que ficam por até 72 h. | photo.service.ts:45-72 | cliente que já pediu o ZIP | baixa a foto apagada (LGPD) |
| A2 | BAIXA | O reaproveitamento de ZIP ignora quem pediu (dono ou visitante). Numa janela curta, o visitante pode receber o original em vez da versão editada. | archive.repository.ts:35-41 | cliente com o link, por timing | original sem edição |
| A3 | BAIXA | O cache da variante de download não tem a versão da edição na chave. Numa corrida, volta a versão antiga. | delivery.service.ts:25-36 | corrida | versão antiga |
| B1 | BAIXA | A miniatura de 600 px nunca leva marca d'água (decisão sua). | derivative.service.ts:33 | visitante | cópia pequena sem marca |
| B2 | BAIXA | O bloqueio da galeria após senhas erradas é check-then-act (passa um pouco do teto) e não avisa você. | public-gallery.service.ts:175-183 | vários IPs | um pouco mais de chutes |
| B3 | BAIXA | O endereço `/g/<slug>` aparece no log de CSP da Vercel. | api/csp-report; csp.ts:92-108 | quem lê os logs | o link da galeria |
| F2 | BAIXA | O RAW do cliente fica no IndexedDB do navegador se a aba fechar ou travar no editor, até a próxima abertura. | editor-storage.ts | acesso ao computador | cópia local do RAW |
| L8 | BAIXA | O erro do Resend é mostrado cru no painel. | email.service.ts:59 | só o dono | — |

### Entradas, editor e dependências (frentes E, F, G)

| # | Sev. | O quê | Onde | Efeito |
|---|---|---|---|---|
| G2/F1 | BAIXA | O LightCraft roda na mesma origem do painel, sem sandbox, e o build é fixado por tag (não por commit) e sem hash do resultado. | vendor/lightcraft/build.sh; develop-editor.tsx:62 | um build adulterado agiria como você |
| G3 | BAIXA | Faltam `npm ci`, `ignore-scripts` e `min-release-age`. | Vercel / .npmrc | troca de pacote na instalação |
| E1 | BAIXA | O teto diário do formulário de contato (200) pode ser gasto por estranhos. | lead.service.ts:74-88 | contato real recusado no dia |
| E2 | BAIXA | Um RAW forjado pode estourar o tempo da função ao gerar a prévia. | raw-preview.ts:53-66 | só o próprio dono |
| zod | BAIXA | `zod@4.6.5` tem um alerta high, que não é alcançável por anônimos. | package.json | atualizar para 4.6.7 |

### Ainda abertos de 07/10 (sem mudança)

| # | O quê |
|---|---|
| 12 | Galeria expirada mostra o nome do estúdio. |
| 13 | A prévia assinada vale até 12 h depois de revogar. Só prévias; originais nunca. |
| 14 | A consulta de status do ZIP não tem limite. |
| 15 | Corrida na cota de upload. |

## Falsos positivos conferidos (não repetir)

- **IDOR** nas rotas de edição, download, processamento e revelação (incluindo `?galeria=`/`?fotos=` de outra conta): a consulta sempre exige `userId` e devolve 404.
- **Upload com galeria de outra conta:** `findOwnedGallery` confere o dono e a coleção.
- **ZIP de favoritos de outro visitante:** fica preso à sessão.
- **`?preview=1`:** exige a sessão do dono.
- **`passwordSealed`:** nunca vai para o visitante. É cifrado com AES-GCM, com chave própria por HKDF.
- **cookieCache:** está desligado, então revogar uma sessão vale na hora.
- **Rotas OTP, e-mail e social do Better Auth:** estão inertes por configuração.
- **Upload de versão editada:** o tipo é checado, o tamanho conferido no bucket e o conteúdo decodificado com sharp. HTML/SVG não entram.
- **Webhook, cron e csp-report:** fechados e com limite.
- **SSRF:** não existe fetch no servidor de URL informada pelo usuário.
- **Dependências:** os alertas de vitest, prisma CLI, mysql2, archiver e fast-uri não são alcançáveis em produção.

## Sólido

- **Bucket privado:** um único `R2_BUCKET`, CSP restrita à origem exata do bucket e nenhum `r2.dev`.
- **Chaves:** a chave de objeto é gerada no servidor, e o download expira em 10 min.
- **Um funil só na galeria:** `resolveGallery` → `decideAccess` em toda rota. Regerar o link e trocar a senha derrubam as sessões dos visitantes.
- **Limites no Postgres:** os rate limits funcionam no serverless.
- **Erros:** os erros genéricos não vazam texto do banco.
- **Navegador:** CSP com nonce no painel e na galeria, cabeçalhos completos e nenhum script de terceiro ou analytics.
- **Senha nova:** a redefinição usa token único de 30 min e derruba todas as sessões.

## Onde a varredura termina

Ficou fora do alcance, porque depende dos painéis ou do que não está no código:

- a configuração do R2 no Cloudflare (acesso público desligado? domínio r2.dev? CORS);
- as variáveis da Vercel em produção e preview (`ALLOW_SIGNUP=false`, `CSP_REPORT_ONLY` ausente, `BETTER_AUTH_SECRET` forte);
- se o preview divide o banco com a produção;
- se o 2FA está **ligado** na sua conta;
- SPF/DKIM/DMARC do domínio de e-mail;
- quem tem acesso aos painéis;
- o backup nunca restaurado.

## Decisões do dono

1. **Sessão:** prazo máximo desde o login (sugestão: 7 dias) e/ou expiração por inatividade (sugestão: 12 h sem uso).
2. **2FA obrigatório** na sua conta, exigido pelo servidor?
3. **"Confiar neste dispositivo":** remover, ou reduzir para 7 dias fixos?
4. **Bloqueio de login:** contar só as tentativas erradas (assim estranhos não bloqueiam você)?
5. **Miniatura com marca d'água?**
6. **Editor numa origem separada** (subdomínio), ou fixar o commit e o hash e aceitar o risco?
7. Senha e link no mesmo e-mail: já decidido por você em 10/11 (fica registrado como aceito).

## Decisões do dono (11/11)

- **Sessão "mais rígida":** 12 h no máximo desde o login, e 2 h sem gesto encerram.
- **2FA obrigatório**, exigido pelo servidor.
- **"Confiar neste dispositivo":** removido.
- **Correções:** todas as levas aprovadas (Next.js, fotos de cliente, o resto do login e o endurecimento).

## Correções (prova antes/depois)

| Achado | Correção | Prova |
|---|---|---|
| G1 | `next@16.4.6`, `zod@4.6.7`, `eslint-config-next@16.4.6` | `npm audit --omit=dev` sem next/zod; tipos, testes e build ok |
| C1 | `expiresIn` 12 h + `disableSessionRefresh`; inatividade de 2 h medida por gesto (`POST /api/session/activity`, gravado em `session.updatedAt`); `session.ts` encerra a sessão fora da regra, inclusive as antigas de 14 dias (`session-policy.ts`) | Ao vivo: a sessão de ontem caiu no login. Com 3 h sem gesto, API 401, sessão apagada e a página foi ao login. Com 13 h de idade, 401. `session-policy.test.ts` |
| C2 | Checkbox removido; o hook recusa `trustDevice: true`; os registros `trust-device-*` são apagados antes de cada login | Ao vivo: `verify-totp` com `trustDevice` → 403 |
| C3 | Sem 2FA, toda página do painel vai para `/ativar-2fa` (fora do painel) e toda ação/rota responde 401 | Ao vivo: download do original → 401 até ativar; ativação com QR, códigos de reserva e volta ao painel |
| C4 | O bloqueio por conta conta só as senhas erradas | Ao vivo: 3 erradas + 1 certa → contador em 3 |
| C5 | Ativar ou desativar o 2FA derruba as outras sessões | Ao vivo: 4 sessões antigas → 1 após ativar |
| C6/C10 | Lista de rotas abertas do Better Auth (`auth-surface.ts`); as outras 23 são recusadas e congeladas num snapshot de teste. Habilitar ou desabilitar o 2FA, gerar códigos e trocar a senha exigem login nos últimos 30 min. O `freshAge` do Better Auth 1.7.7 **não** cobre `disable` nem `change-password` | Ao vivo: `get-totp-uri` e `update-session` → 403; com a sessão de 40 min, `enable`, `disable`, códigos e troca de senha → 403 |
| C7 | O desvio do `/login` saiu do proxy e passou para a página, que confere a sessão de verdade | — |
| C8 | Limite de 3 pedidos por hora **por e-mail** na redefinição de senha | — |
| C9 | `BETTER_AUTH_SECRET` com menos de 32 caracteres derruba o servidor em produção | `auth-secret.test.ts` |
| D1 | O visitante só recebe a prévia feita com a marca d'água atual (antes disso, recebe a miniatura). O servidor regera as prévias ao escolher ou editar a marca (`after`) | `photo-source.test.ts` (visiblePreviewKey) |
| A1 | Apagar a foto ou trocar a edição aposenta os ZIPs que a contêm | Bateria: o ZIP com a foto → FAILED; o ZIP de controle segue READY |
| A2 | O ZIP do dono não é reaproveitado para o cliente (`requestedByUserId` na busca) | — |
| A3 | A cópia de download leva a origem na chave (original ou token da edição) | `delivery.service.test.ts` |
| B2 | O bloqueio da galeria conta antes de conferir (atômico) e devolve a tentativa se a senha estiver certa. Você é avisado (atividade `GALLERY_LOCKED` + e-mail). Migração `20261111120000_gallery_locked_activity` | Bateria: a senha certa não consome; rajada de 40 → exatamente 20 |
| B3 | O slug sai como `/g/[slug]` no log de CSP | `csp.test.ts` |
| F2 | A cópia dos RAWs no navegador é apagada ao sair, no login e em qualquer página do painel fora do editor | — |
| L8 | O erro do provedor de e-mail vai para o log; o painel mostra um texto nosso | — |
| E2 | O leitor de RAW para no primeiro quadro sem fim, com teto de 20 000 candidatos | O mesmo arquivo forjado de 3 MB: **68 s antes**, menos de 1 s depois |
| 14 | 60 consultas por minuto, por IP e por ZIP, no status do visitante | — |
| G2 | O `build.sh` confere o commit auditado da tag. `SHA256SUMS.json` + teste reprovam qualquer arquivo trocado em `public/lightcraft` | Prova negativa: um `fetch` enxertado no `worker.js` → teste reprovado |
| G3 | `installCommand: npm ci` na Vercel | `npm ci --dry-run` ok |

## Fica aberto (para decidir ou depois)

- **E1:** o teto diário do formulário de contato pode ser gasto por estranhos. Pede desafio anti-robô (Turnstile): decisão sua.
- **B1:** a miniatura de 600 px sem marca d'água (decisão sua). Com marca d'água, durante a regeração o visitante vê a miniatura.
- **F1:** o editor segue na mesma origem. A origem do build agora é conferida (G2); um subdomínio próprio fica para depois.
- **G3:** `ignore-scripts` e `min-release-age` não foram ligados (o Prisma precisa do postinstall).
- **12, 13, 15 de 07/10:** sem mudança.
- **Bloqueio de login (C4):** quem sabe o seu e-mail ainda pode errar de propósito e travar o login por 15 min. Com o 2FA obrigatório, a senha sozinha não abre nada.
- **Fora do código:** confira na Vercel `ALLOW_SIGNUP=false` e a ausência de `CSP_REPORT_ONLY`, e no Cloudflare o R2 sem acesso público.
