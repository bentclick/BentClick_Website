# Plano: revelação de RAW no site com LightCraft

Pesquisa feita em 2026-11-09, na documentação oficial do projeto (`storytold/lightcraft`).

## Resposta curta

**É possível.** O LightCraft tem versão para navegador e foi feito para rodar dentro de outra página: o site abre o editor num quadro, entrega os bytes da foto e recebe o aviso de salvamento. Não precisa de servidor próprio, porque a revelação roda no computador de quem edita.

A ressalva é a maturidade. O projeto se declara **alpha** e estima cerca de 51% de paridade com o Lightroom para um fotógrafo profissional. Por isso o plano começa com um piloto curto e mantém o RAW original sempre intacto.

## O que a documentação confirma

| Tema | Situação |
|---|---|
| Licença | MIT ou Apache-2.0. O nome e a marca ArtCraft não entram na licença: versão modificada precisa removê-los |
| Versão web | WebAssembly + WebGL2, site estático, cerca de 4,6 MB (gzip) mais uma fonte opcional de 16 MB |
| Integração | Modo quadro `?host=parent`, por `postMessage`, **somente na mesma origem**. Mensagens: `lightcraft:open`, `lightcraft:cmd`, `lightcraft:ready`, `lightcraft:save`, `lightcraft:dirty`, `lightcraft:failed` |
| PC e web | Mesmo programa e mesmo código de revelação. Na web as fotos são processadas pela CPU em workers; máscaras com IA (objeto/descrição), reconhecimento de rostos e importar/exportar presets em arquivo não existem |
| Salvamento | `lightcraft:save` entrega o arquivo exportado como `{name, bytes}`. A documentação não fala em devolver os ajustes |
| Automação | `lightcraft.command(id, paramsJson)` executa qualquer comando do editor |
| Formatos | DNG, CR2/CR3, ARW, NEF, RAF, RW2/RWL, PEF, ORF, SRW |
| Exportação | JPEG, PNG, TIFF, WebP e outros |

## Riscos

| Risco | Efeito | Como tratar |
|---|---|---|
| Cor de Sony estimada | Só alguns modelos têm perfil pronto; a cor pode diferir do Lightroom | Medir no piloto com arquivos das suas câmeras |
| Projeto alpha, muda rápido | Uma atualização pode quebrar a integração | Fixar uma versão e atualizar só depois de testar |
| Erro do decodificador derruba a página | Edição não salva é perdida | Editor numa tela própria; salvar com frequência |
| Exportação na thread principal | A tela pode travar em arquivos grandes | Aviso de progresso; uma foto por vez na primeira versão |
| Consumo de memória | Cache de originais de até 768 MB | Uso em computador; bloquear no celular |
| Mesma origem do painel | O editor roda com o mesmo acesso do painel | Publicar só arquivos de versão fixada e conferida; carregar apenas na tela do editor |
| Navegadores | Safari e Firefox ainda em teste | Liberar Chrome e Edge primeiro |

## O que muda na segurança

A integração exige ajustes no CSP ativado agora, só na rota do editor:

- `script-src`: acrescentar `'wasm-unsafe-eval'`, sem liberar `'unsafe-eval'`.
- `worker-src 'self'` e `frame-src 'self'`.
- `frame-ancestors 'self'` e `X-Frame-Options: SAMEORIGIN` apenas para os arquivos do editor; o resto continua proibindo quadros.

## Fases

### Fase 0: piloto (1 a 2 dias, nenhuma mudança no site)

O programa para PC já foi aprovado pelo fotógrafo. Falta testar a versão web (`lightcraft-web-0.19.0`) fora do site com alguns RAW reais.

- Comparar cor e velocidade com o PC e checar exportação e estabilidade.
- Verificar se os ajustes podem ser guardados e reabertos, e se copiar ajustes entre fotos funciona.
- **Critério para seguir:** a cor igual à do PC e nada travar em uma sessão normal de edição.

### Fase 1: versão editada (implementada)

Vale mesmo que o piloto reprove o LightCraft. Só em coleções de cliente: no portfólio basta enviar o JPG.

- **Versão editada** ligada à foto (JPG, PNG ou WebP), sem alterar o RAW.
- Na grade: "Enviar editadas" (lote, casando pelo nome do arquivo) e, em cada foto, "Enviar versão editada" e "Voltar ao original".
- Prévias, marca d'água, download e ZIP do cliente usam a versão editada. O fotógrafo continua baixando o RAW.

Camadas: migração `photo_edited_version`, `photo-edit.repository`, `photo-edit.service`, `lib/images/photo-source`, rotas `api/photos/[id]/edit`. `editRecipe` fica para a Fase 3, se o piloto confirmar que os ajustes podem ser guardados.

### Fase 2: editor dentro do painel

- Arquivos do LightCraft em versão fixada, servidos pelo próprio site, em caminho separado.
- Tela `dashboard/.../revelar/[photoId]` com o quadro em `?host=parent&store=memory`.
- Ponte em componente próprio: baixa o RAW por link assinado curto, envia com `lightcraft:open`, recebe o resultado e sobe a versão editada por URL assinada, como nos uploads atuais.
- Avisar antes de sair com edição não salva, usando `lightcraft:dirty`.
- Ajustes de CSP descritos acima, com teste automático.
- Liberar somente em computador com Chrome ou Edge.

### Fase 3: fluxo de trabalho

- Navegar para a foto anterior e a próxima.
- Copiar ajustes para várias fotos e presets.
- Reabrir uma edição, se a Fase 0 confirmar que os ajustes podem ser guardados.

### Fora do plano por enquanto

Revelar em servidor com `lightcraft-cli`. Exigiria uma máquina à parte, porque a Vercel não comporta esse trabalho, e só compensa para lotes grandes.

## Decisão pedida

Rodar a Fase 0 com arquivos seus e decidir com base no resultado. A Fase 1 pode começar em paralelo.

## Fontes

- [README do LightCraft](https://raw.githubusercontent.com/storytold/lightcraft/main/README.md)
- [docs/web.md](https://raw.githubusercontent.com/storytold/lightcraft/main/docs/web.md)
- [Wiki do projeto](https://github.com/storytold/lightcraft/wiki)
