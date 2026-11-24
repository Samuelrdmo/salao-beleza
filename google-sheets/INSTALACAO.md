# Planilha do Google como banco de dados

Faça isto **na conta Google do salão** (ou peça para compartilharem a tela). Leva uns 10 minutos.

## 1. Criar a planilha e o script

1. Em [sheets.new](https://sheets.new), crie uma planilha com o nome do salão (ex.: "Agenda Íris").
2. Menu **Extensões → Apps Script**. Apague o conteúdo de `Código.gs`, cole todo o arquivo `google-sheets/Code.gs` e salve (Ctrl+S).
3. Volte à planilha e recarregue a página. Aparece o menu **🐾 Agenda do site**.
4. **🐾 Agenda do site → 1. Preparar a planilha**. O Google pede autorização: escolha a conta, clique em *Avançado → Acessar (não seguro)* (o aviso aparece porque o script é do próprio salão e não passou por verificação) e permita.
   São criadas as abas **Agendamentos**, **Servicos**, **Campos**, **Config**, **Admins** e **Sessoes**, já com exemplos de salão, e a limpeza automática de madrugada.
5. **🐾 Agenda do site → 2. Criar ou trocar a senha**: usuário, senha (mínimo 8 caracteres) e o nome que aparece na agenda. Repita para cada pessoa da equipe.
6. Ajuste as abas:
   - **Config:** `nome_loja`, `abre`, `fecha`, `intervalo_min`, `vagas_por_horario`, `dias_fechados` (0 = domingo … 6 = sábado), `dias_antecedencia`, `email_aviso`, `whatsapp` (55 + DDD + número), `endereco`, `instagram`.
   - **Servicos:** nome, descrição, duração, preço (texto livre, ex.: "a partir de R$ 70"), ícone (`tesoura`, `secador`, `pincel`, `gota`, `unhas`, `olhar`, `spa`, `flor` ou um emoji), link da foto e se está ativo.
   - **Campos:** os campos do formulário além de nome e WhatsApp (já vem com a escolha da profissional). Depois de mexer, use o menu **Atualizar campos do formulário**.

## 2. Publicar o script como API

1. No Apps Script: **Implantar → Nova implantação**.
2. Engrenagem → **App da Web**.
3. *Executar como:* **Eu**. *Quem pode acessar:* **Qualquer pessoa**.
4. **Implantar** e autorize de novo se pedir.
5. Copie a **URL do app da Web** (termina em `/exec`), ou use o menu **Dados para o site**, e cole em `sheetsApiUrl` no `clients/<slug>/client.json`.

"Qualquer pessoa" não deixa a planilha pública: o site só recebe os serviços, os horários livres e o que a própria pessoa agendou. A agenda completa só sai com usuário e senha.

## 3. Conferir

1. `npm run dev -- --mode <slug>` e faça um agendamento de teste pelo site.
2. Veja a linha nova na aba Agendamentos (e o e-mail, se `email_aviso` estiver preenchido).
3. Abra `#/admin`, entre com o usuário e a senha , abra um agendamento e desmarque, ou crie um bloqueio em "Bloquear horário": as abas Agendamentos e Bloqueios acompanham.
4. Tente agendar o mesmo horário até acabar as vagas: ele passa a aparecer riscado.

## Atualizar o script depois

Cole a versão nova do `Code.gs`, salve e vá em **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão → Implantar**. A URL continua a mesma. Criar uma "Nova implantação" gera outro endereço e exige republicar o site.
