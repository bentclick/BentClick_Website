# LightCraft do BentClick

O editor da tela "Revelar no site" (`/dashboard/revelar/[photoId]`) é o [LightCraft](https://github.com/storytold/lightcraft) web, compilado aqui com correções nossas. Ele é servido em `public/lightcraft/<versão>`.

Assim não precisamos esperar uma versão oficial para corrigir um defeito.

## Versão atual: `0.20.0-bentclick.1`

Base: tag oficial `v0.20.0`. Patches em `patches/`, aplicados em ordem:

| Patch | O que faz | Enviado ao LightCraft |
|---|---|---|
| `0001` | Troca o relógio da remoção de hot pixels por `web_time`. Sem isso, o editor web trava ao revelar qualquer RAW ("time not implemented on this platform"). | storytold/lightcraft#4031 (issue #4017) |
| `0002` | Tira a marca ArtCraft: Discord e site no menu Ajuda, na barra superior, na janela Sobre e nas traduções. | Não: só vale para a nossa versão |

## Licença

- O código é MIT ou Apache-2.0. Distribuímos sob a MIT. Por isso `LICENSE-MIT`, `LICENSE-APACHE` e `NOTICE` vão junto dos arquivos publicados, além de `OFL-Inter.txt`, a licença da fonte embutida.
- O nome e a logo ArtCraft são marca registrada e não entram na licença do código. Uma versão modificada precisa removê-los (`docs/brand/LICENSE-brand.txt` no repositório deles). O patch `0002` faz isso.
- Podemos dizer, em texto simples, que é baseado no LightCraft do time ArtCraft. A janela Sobre diz exatamente isso.

## Como compilar

```bash
vendor/lightcraft/build.sh /caminho/para/uma/pasta/vazia
```

O script clona a tag, aplica os patches, compila com `cargo xtask web` e copia o resultado para `public/lightcraft/<versão>`.

## Ao atualizar

1. Ajuste `TAG` e `VERSION` em `build.sh`.
2. Ajuste `LIGHTCRAFT_VERSION` em `src/lib/security/csp.ts`. A pasta antiga sai de `public/lightcraft`.
3. Tire os patches que a versão oficial já incorporou.
4. Confira se o patch `0002` ainda cobre todas as telas: procure "ArtCraft" no código de `crates/ui-egui` e nas traduções.
5. Rode `npx vitest run src/lib/security`. Se o script embutido do `index.html` mudou, o teste mostra o hash novo de `LIGHTCRAFT_INLINE_SCRIPT_HASH`.
6. Teste no painel:
   - Abrir um RAW e esperar o selo "Prévia da câmera" sumir.
   - Mexer na exposição.
   - Clicar em "Aplicar à foto" e conferir a versão editada na coleção.
