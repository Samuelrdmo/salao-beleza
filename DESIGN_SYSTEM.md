# Design system de um cliente

Cada site é montado a partir do design system do salão. As informações abaixo viram três arquivos em `clients/<slug>/`. A estrutura das telas (início, agendar, meu agendamento, agenda da equipe) é a mesma para todos; o que muda é a identidade.

## 1. O que enviar

### Marca
- Nome completo (ex.: "Studio Íris") e nome curto para o topo (ex.: "Íris").
- Assinatura (ex.: "CABELO & BELEZA").
- Logo horizontal em **SVG** (ideal) ou PNG transparente, com largura × altura. Sem logo, o site usa o nome com o ícone de flor.
- Ícone quadrado para o favicon.

### Cores (hex)
| Token | Papel | Exemplo Íris |
|---|---|---|
| `--ivory` | Fundo principal | `#FFF7EE` |
| `--surface` | Cartões, formulários, painéis | `#FFFFFF` |
| `--ink` | Texto, ícones e botões principais | `#173B3F` |
| `--ink-hover` | Botão principal ao passar o mouse | `#1F4D52` |
| `--gold` | Cor de acento: destaques, horário escolhido, ícones | `#FF7B54` |
| `--gold-light` | Fundos suaves e realces | `#FFE2D6` |
| `--muted` | Texto secundário | `#5B6B6C` |
| `--border` | Divisórias e contornos | `#F0E3D5` |
| `--success`, `--danger`, `--danger-bg` | Estados | `#2E8B6A`, `#C2412D`, `#FFF0EB` |
| `--radius`, `--radius-small`, `--radius-hero` | Cantos de cartões, botões menores e da foto principal | `22px`, `14px`, `36px` |

Regras: texto `--ink` sobre `--ivory`/`--surface` com contraste mínimo de 4,5:1; botão é `--ink` com texto `--surface`. Para marcas escuras, inverta (veja a paleta Noite em `clients/demo/tokens.css`).

### Tipografia
- Fonte de títulos (`--serif`, mesmo que não seja serifada) e fonte de texto (`--sans`), do Google Fonts, com os pesos usados.

### Textos (tom de voz)
Campos de `texts` no `client.json`. Use `|` para quebrar linha e `*palavra*` para destacar na cor de acento.

| Campo | Onde aparece |
|---|---|
| `topline` | Faixa no topo do site |
| `heroEyebrow`, `heroTitle`, `heroText`, `heroCta`, `heroBottom` | Abertura da página inicial |
| `heroCaptionTitle`, `heroCaptionText`, `heroStamp` | Legenda e selo da foto principal (computador) |
| `servicesEyebrow`, `servicesTitle` | Título da lista de serviços |
| `footerTagline`, `footerNote` | Rodapé |
| `loginTitle`, `loginImageText` | Tela de entrada da equipe |

### Fotos
- Foto principal (de preferência uma cliente sendo atendida, mínimo 1400 px) → `public/images/hero.jpg`.
- Foto da tela de entrada da equipe → `public/images/login.jpg`.
- Foto de cada serviço (opcional) → link na coluna "Foto (link)" da aba Servicos.

### Funcionamento (vai na planilha, não no código)
Horário de abertura e fechamento, intervalo entre horários, dias fechados, quantas clientes ao mesmo tempo, serviços com preço e duração, e os campos do formulário (nome do pet, espécie, porte, raça…).

## 2. Onde cada coisa vai

| Do design system | Para |
|---|---|
| Cores, fontes, raios | `clients/<slug>/tokens.css` |
| Link do Google Fonts | `seo.fontsUrl` no `client.json` |
| Nome, assinatura, logo | `brand` no `client.json` + arquivo em `public/brand/` |
| Textos | `texts` no `client.json` |
| Fotos | `public/images/` + `images` no `client.json` |
| Favicon | `public/favicon.svg` |
| Cor da barra do navegador | `seo.themeColor` (normalmente a cor de fundo) |
| Contatos iniciais | `contact` no `client.json` (depois valem os da aba Config) |

A marca **Studio Íris** de `clients/demo` é fictícia, criada só para a apresentação. Nunca reutilize em cliente: o `novo-cliente` já troca o nome e deixa o favicon neutro.
