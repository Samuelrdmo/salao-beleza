# Instruções para o Claude neste repositório

Produto: Agenda Salão Octype, site de salão com agendamento online, agenda da equipe e planilha do Google. Um código, vários clientes em `clients/<slug>/`.

## Quando o Samuel enviar um design system para um salão novo

1. `npm run novo-cliente -- <slug> "Nome do Salão"`.
2. Preencha `clients/<slug>/tokens.css` com as cores/fontes/raios (tabela em `DESIGN_SYSTEM.md`). Confira contraste de `--ink` sobre `--ivory` e `--surface` (mínimo 4,5:1).
3. Preencha `client.json`: `brand`, `seo` (`fontsUrl` e `themeColor`), `texts` no tom de voz da marca, `images`, `contact`.
4. Logo em `public/brand/`, favicon em `public/favicon.svg`, fotos em `public/images/` (`hero.jpg`, `login.jpg`). Apague as fotos de demonstração que não forem usadas.
5. Rode `npm run dev -- --mode <slug>` e confira início, agendamento completo, meu agendamento e agenda da equipe no navegador, também no celular (375 px).
6. `npm test` e `npx vite build --mode <slug>`.

## Regras

- Não coloque decisões de marca em `src/`. Cores e fontes só em `tokens.css`; nomes e textos só em `client.json`.
- Serviços, preços, horários e campos do formulário ficam na planilha, não no código. Os de `src/demo.ts` são só da demonstração.
- Se uma tela precisar de um texto novo por cliente, adicione a chave em `TextKey` (`src/config.ts`), em todos os `client.json` e na tabela do `DESIGN_SYSTEM.md`.
- `clients/demo` é a apresentação de venda (`presentation: true`). A marca da demo (Studio Íris) é fictícia; não use dados reais de clientes nela.
- A página de venda não cita planilha, Google nem Cloudflare: fala só em "opção sem mensalidade" e "estrutura dedicada".
- A senha da equipe nunca vai para o código: fica com hash na aba Admins da planilha.
- Mudanças em `google-sheets/Code.gs` exigem nova versão da implantação em cada planilha de cliente; avise o Samuel.
