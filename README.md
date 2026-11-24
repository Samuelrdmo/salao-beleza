# Agenda Salão Octype — site com agendamento online para salões de beleza

Um só código para vários sites de salão. Cada salão tem:

- **Site com a marca dele** (logo, cores, fontes, textos e fotos) e a lista de serviços com preço e duração.
- **Agendamento online em 3 passos**: serviço → dia e horário (só os livres) → dados da cliente e a profissional.
- **"Meu agendamento"**: a cliente encontra o horário marcado pelo WhatsApp + nome.
- **Agenda da equipe** (`#/admin`, com usuário e senha): calendário de semana e dia (barras do tamanho de cada atendimento, como no Google Agenda) e lista. Não existe confirmação: todo agendamento já entra na agenda. Para desmarcar, a equipe fala com a cliente pelo WhatsApp e marca como desmarcado. Dá para bloquear um horário, um período ou o dia inteiro, só numa data ou toda semana (ex.: sábado só até as 15h).
- **Banco de dados na planilha do Google do salão** (Apps Script em `google-sheets/Code.gs`).
- **Hospedagem no Cloudflare Pages do salão**, com endereço gratuito `nome.pages.dev`.

Custo mensal da estrutura: zero (planos gratuitos do Google e da Cloudflare). Domínio próprio, se quiser, é pago à parte.

## Design system do produto

Visual delicado e elegante: títulos em **Marcellus** (serifa clássica), texto em **Jost**, palavra de destaque na **cor de acento** (rosé), eyebrows espaçados em caixa alta, botões retos e finos e foto principal em arco. As regras de identidade ficam em `src/identity.css`; cores, fontes e raios de cada cliente em `clients/<slug>/tokens.css`.

## Organização

| Caminho | O que é |
|---|---|
| `src/main.tsx` | Início, agendar, meu agendamento e agenda da equipe. |
| `src/domain.ts` | Regras de horários, datas, telefone e mensagem (com testes). |
| `src/api.ts` | Fala com a planilha, ou guarda tudo no navegador quando não há planilha. |
| `src/pitch.tsx` | Página de venda do produto (GSAP + React Bits), só na apresentação. |
| `clients/<slug>/client.json` | Nome, contatos, textos, SEO e a URL da planilha da cliente. |
| `clients/<slug>/tokens.css` | Cores, fontes e raios do design system da cliente. |
| `clients/<slug>/public/` | Logo, favicon, fotos e o `_headers` da Cloudflare. |
| `clients/demo/` | **Apresentação do produto**: página de venda + salão fictício "Studio Íris" + agenda aberta. |
| `google-sheets/` | Script da planilha e passo a passo de instalação. |

## Rodar

Requer Node.js 22+.

```powershell
npm install
npm run dev
```

Abre a apresentação (`clients/demo`). Para ver um cliente: `npm run dev -- --mode <slug>`.

## A apresentação (para vender)

`clients/demo` tem `"presentation": true`. Nesse modo:

- `#/` é a página de venda, com o botão **Ver site de apresentação**.
- `#/loja` é o salão fictício: 6 serviços, agendamento de verdade (guardado no navegador) e "meu agendamento".
- `#/admin` abre a agenda da equipe **sem login**, já com agendamentos de exemplo. O que for agendado pelo site aparece ali.
- A barra fixa embaixo leva à apresentação, ao site e à agenda, e troca a **paleta** (Coral, Céu, Menta, Noite).

Nome do produto, contato do botão "Quero aproveitar" e preço ficam em `pitch` no `clients/demo/client.json` (mesmo formato do Catálogo e da Vitrine de joias: `price`, `promoPrice`, `promoLabel`, `promoNote`; apague `promoPrice` quando a oferta acabar).

## Nova cliente, do design system ao ar

1. `npm run novo-cliente -- <slug> "Nome do Salão"`.
2. Aplique o design system em `tokens.css`, `client.json` e `public/` (veja `DESIGN_SYSTEM.md`).
3. Confira: `npm run dev -- --mode <slug>`. Sem planilha, o painel entra com `demo` / `demo1234`.
4. Instale a planilha na conta Google do salão (`google-sheets/INSTALACAO.md`) e cole a URL do Apps Script em `sheetsApiUrl`.
5. Na conta Cloudflare do salão: `npx wrangler logout`, `npx wrangler login` e `npm run publicar -- <slug>`.

## Como os dados funcionam

- **Serviços, horários, campos e contatos** vêm da planilha (abas Servicos, Config e Campos). O salão muda preço, horário de funcionamento, dias fechados, quantos pets por horário e os campos do formulário direto na planilha.
- **Disponibilidade:** o site pergunta os horários livres de cada dia; os ocupados e os que já passaram aparecem riscados.
- **Agendar:** o Apps Script confere tudo de novo e usa uma trava, então dois clientes nunca pegam a última vaga do mesmo horário.
- **Aviso:** com `email_aviso` preenchido na aba Config, cada novo agendamento chega por e-mail. Depois de agendar, a cliente também pode avisar pelo WhatsApp com a mensagem pronta.
- **Equipe:** usuário e senha criados pelo menu da planilha. A senha fica guardada só como hash, e a sessão expira em 12 horas. Depois de 5 senhas erradas, o acesso trava por 15 minutos.
- **Limpeza:** agendamentos antigos são apagados sozinhos de madrugada (padrão: 3 dias depois do atendimento).

## Verificação

```powershell
npm test
npm run build
```

Os testes cobrem geração de horários, dias fechados, datas, máscara de telefone e a mensagem do WhatsApp. O Apps Script não tem teste automático: confira numa planilha real seguindo `google-sheets/INSTALACAO.md`.

## Créditos

Animações da página de venda com **GSAP** e componentes do **React Bits** em `src/reactbits/` (licença em `src/reactbits/LICENSE.md`: pode usar em sites e produtos, não pode revender os componentes em si). Fotos de demonstração do Unsplash. A lógica de agendamento da planilha vem do modelo de agendamento Rin Tin Tin.

## Campos de formulário (shadcn/ui)

Todos os campos usam componentes do [shadcn/ui](https://ui.shadcn.com) em `src/components/ui` (Input, Textarea, Select, Checkbox e Label), com o rótulo e a dica em `src/components/field.tsx`. O Tailwind CSS entra só para esses componentes (sem o reset global) e as cores do shadcn apontam para os tokens da cliente em `src/index.css`, então cada marca muda os campos sozinha. Para adicionar outro componente: `npx shadcn@latest add <nome>` e troque `from "cn"` por `from "@/lib/utils"` se o CLI errar o import.
