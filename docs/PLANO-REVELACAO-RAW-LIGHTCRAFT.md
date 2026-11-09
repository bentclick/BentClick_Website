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

Testar a versão web fora do site com 20 a 30 RAW reais das suas câmeras.

- Avaliar cor, velocidade, exportação e estabilidade.
- Descobrir o conteúdo exato de `lightcraft:save`, que a documentação não detalha, e se os ajustes podem ser guardados e reabertos.
- **Critério para seguir:** você aprovar a cor e nada travar em uma sessão normal de edição.

### Fase 1: versão editada (sem editor embutido)

Vale mesmo que o piloto reprove o LightCraft.

- Guardar uma **versão editada** ligada à foto, sem alterar o RAW.
- Botão "Substituir por versão editada" e envio em lote casando pelo nome do arquivo.
- Prévias, marca d'água e download do cliente passam a usar a versão editada.
- Opção "voltar ao original".

Camadas: migração (`editedKey`, `editedAt`, `editRecipe`), `photo-edit.repository`, `photo-edit.service`, rotas de envio e botão na grade.

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
