/**
 * Agenda Salão — agendamento online do salão usando a planilha do Google do salão.
 * O visual do site (cores, fontes, textos) fica no código do site; aqui ficam
 * serviços, horários, campos do formulário, agendamentos e a senha da equipe.
 *
 * Este arquivo fica DENTRO da planilha (Extensões > Apps Script). Quem recebe a
 * planilha-modelo já recebe este código junto, e faz tudo pelo menu
 * "🐾 Agenda do site" que aparece no topo da planilha.
 *
 * INSTALAÇÃO (quem recebeu a planilha):
 * 1. Menu "🐾 Agenda do site" > "1. Preparar a planilha" (autorize quando pedir).
 * 2. Menu > "2. Criar ou trocar a senha" e digite a senha do painel.
 * 3. Extensões > Apps Script > Implantar > Nova implantação > App da Web
 *      Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
 * 4. Menu > "Dados para o site" e mande o endereço que aparecer para quem monta o site.
 *
 * Ao mudar este código: Implantar > Gerenciar implantações > editar > Nova versão.
 * Assim o endereço do site continua o mesmo.
 */

const ABAS = {
  agendamentos: 'Agendamentos',
  servicos: 'Servicos',
  campos: 'Campos',
  config: 'Config',
  admins: 'Admins',
  sessoes: 'Sessoes',
  categorias: 'Categorias',
  bloqueios: 'Bloqueios',
};

/* A aba Agendamentos tem estas colunas fixas, e no meio delas entram os campos
   do formulário (aba Campos), cada um na sua coluna. */
const COL_INICIO = ['ID', 'Criado em', 'Data', 'Hora', 'Duração (min)', 'Serviço', 'Cliente', 'Telefone'];
const COL_FIM = ['Observações', 'Status'];

const CAB = {
  Servicos: ['ID', 'Nome', 'Descrição', 'Duração (min)', 'Preço', 'Ícone', 'Foto (link)', 'Categoria', 'Ativo', 'ID da foto no Drive'],
  Categorias: ['Categoria'],
  Bloqueios: ['ID', 'Tipo', 'Data', 'Dia da semana', 'Início', 'Fim', 'Motivo'],
  Campos: ['ID', 'Rótulo', 'Tipo', 'Opções', 'Obrigatório', 'Ativo'],
  Config: ['Chave', 'Valor', 'Explicação'],
  Admins: ['Usuario', 'Nome', 'Salt', 'Hash', 'Ativo'],
  Sessoes: ['Token', 'Usuario', 'Expira'],
};

/* Não existe confirmação: todo agendamento entra como Agendado; a equipe só pode desmarcar. */
const STATUS_VALIDOS = ['Agendado', 'Cancelado'];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SESSAO_HORAS = 12;
const TZ_PADRAO = 'America/Sao_Paulo';

/* ============================== MENU DA PLANILHA ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🐾 Agenda do site')
    .addItem('1. Preparar a planilha', 'instalar')
    .addItem('2. Criar ou trocar a senha', 'criarSenha')
    .addSeparator()
    .addItem('Dados para o site', 'mostrarDados')
    .addItem('Atualizar campos do formulário', 'atualizarCampos')
    .addItem('Apagar agendamentos antigos agora', 'limparAgora')
    .addToUi();
}

/* ============================== ENTRADA ============================== */

function doGet() {
  return responder({ ok: true, nome: 'API de agendamento', dica: 'Use POST com {action}' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const acoes = {
      config: acaoConfig,
      disponibilidade: acaoDisponibilidade,
      agendar: acaoAgendar,
      buscar: acaoBuscar,
      login: acaoLogin,
      logout: acaoLogout,
      listar: acaoListar,
      status: acaoStatus,
      servicos: acaoServicos,
      salvarServico: acaoSalvarServico,
      excluirServico: acaoExcluirServico,
      criarCategoria: acaoCriarCategoria,
      excluirCategoria: acaoExcluirCategoria,
      bloqueios: acaoBloqueios,
      criarBloqueio: acaoCriarBloqueio,
      excluirBloqueio: acaoExcluirBloqueio,
    };
    const fn = acoes[req.action];
    if (!fn) throw erro('Ação inválida.');
    return responder(Object.assign({ ok: true }, fn(req)));
  } catch (err) {
    return responder({ ok: false, erro: err.publico ? err.message : 'Erro no servidor. Tente de novo.' });
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function erro(msg) {
  const e = new Error(msg);
  e.publico = true;
  return e;
}

/* ============================== AÇÕES PÚBLICAS ============================== */

function acaoConfig() {
  const c = lerConfig();
  return {
    nome: c.nome_loja,
    servicos: lerServicos(),
    categorias: lerCategorias(),
    // O site só precisa saber quando cada bloqueio vale; o motivo fica para a equipe.
    bloqueios: lerBloqueios().map(function (b) { return { id: b.id, tipo: b.tipo, data: b.data, diaSemana: b.diaSemana, inicio: b.inicio, fim: b.fim }; }),
    campos: lerCampos(),
    horarios: {
      abre: c.abre, fecha: c.fecha, intervalo: c.intervalo_min,
      diasFechados: c.dias_fechados, antecedencia: c.dias_antecedencia,
    },
    contato: { whatsapp: c.whatsapp, endereco: c.endereco, instagram: c.instagram },
  };
}

function acaoDisponibilidade(req) {
  const data = validarData(req.data);
  const c = lerConfig();
  const servico = lerServicos().filter(function (s) { return s.id === req.servico; })[0];
  return { data: data, fechado: diaFechado(data, c), horarios: calcularHorarios(data, servico ? servico.duracao : 60, c) };
}

/**
 * Horários livres para um serviço com duração: o atendimento inteiro precisa caber antes de
 * fechar, fora dos bloqueios, sem passar do número de vagas em nenhum momento.
 * (Mesma regra de calcularHorarios em src/domain.ts.)
 */
function calcularHorarios(data, duracao, c) {
  const agora = Utilities.formatDate(new Date(), c.fuso, 'yyyy-MM-dd HH:mm');
  const fecha = minutos(c.fecha);
  const travas = bloqueiosDoDia(data);
  const ativos = lerAgendamentos().filter(function (a) { return a.data === data && a.status !== 'Cancelado'; });
  const dur = Math.max(5, Number(duracao) || 60);
  return gerarHorarios(c).map(function (hora) {
    const ini = minutos(hora); const fim = ini + dur;
    const passou = (data + ' ' + hora) <= agora;
    const bloqueado = travas.some(function (b) { return minutos(b.inicio) < fim && minutos(b.fim) > ini; });
    let pico = 0;
    for (let t = ini; t < fim; t += 5) {
      const n = ativos.filter(function (a) { return minutos(a.hora) <= t && minutos(a.hora) + (a.duracao || 60) > t; }).length;
      if (n > pico) pico = n;
    }
    return { hora: hora, livre: !passou && fim <= fecha && !bloqueado && pico < c.vagas_por_horario };
  });
}

function minutos(h) { const p = String(h).split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); }

function acaoAgendar(req) {
  const c = lerConfig();
  const cliente = texto(req.nome, 'Nome', 80);
  const telefone = soDigitos(req.telefone);
  if (telefone.length < 10 || telefone.length > 11) throw erro('Telefone inválido. Use DDD + número.');
  const obs = String(req.obs || '').slice(0, 300);
  const data = validarData(req.data);
  const hora = String(req.hora || '');
  const servico = lerServicos().filter(function (s) { return s.id === req.servico; })[0];
  if (!servico) throw erro('Escolha um serviço.');

  // Campos extras configurados na aba Campos.
  const enviados = req.campos || {};
  const extras = {};
  lerCampos().forEach(function (campo) {
    const valor = String(enviados[campo.id] || '').trim().slice(0, 120);
    if (!valor && campo.obrigatorio) throw erro('Preencha: ' + campo.rotulo + '.');
    if (valor && campo.tipo === 'opcoes' && campo.opcoes.indexOf(valor) === -1) throw erro('Opção inválida em ' + campo.rotulo + '.');
    extras[campo.rotulo] = valor;
  });

  if (diaFechado(data, c)) throw erro('Não abrimos nesse dia.');
  const horarioPedido = calcularHorarios(data, servico.duracao, c).filter(function (h) { return h.hora === hora; })[0];
  if (!horarioPedido) throw erro('Horário inválido.');
  const agora = Utilities.formatDate(new Date(), c.fuso, 'yyyy-MM-dd HH:mm');
  if ((data + ' ' + hora) <= agora) throw erro('Esse horário já passou.');

  // Trava para duas pessoas não pegarem a última vaga ao mesmo tempo.
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const livre = calcularHorarios(data, servico.duracao, c).filter(function (h) { return h.hora === hora; })[0];
    if (!livre || !livre.livre) throw erro('Esse horário acabou de ser preenchido. Escolha outro.');
    const id = 'A' + Utilities.getUuid().slice(0, 8).toUpperCase();
    const valores = {
      'ID': id,
      'Criado em': Utilities.formatDate(new Date(), c.fuso, 'yyyy-MM-dd HH:mm'),
      'Data': data, 'Hora': hora, 'Duração (min)': String(servico.duracao), 'Serviço': servico.nome,
      'Cliente': cliente, 'Telefone': telefone,
      'Observações': obs, 'Status': 'Agendado',
    };
    Object.keys(extras).forEach(function (k) { valores[k] = extras[k]; });

    const sh = aba(ABAS.agendamentos);
    const cabecalho = lerCabecalho(sh);
    sh.appendRow(cabecalho.map(function (h) { return valores[h] !== undefined ? valores[h] : ''; }));
    SpreadsheetApp.flush();
    avisarDono(c, { id: id, data: data, hora: hora, servico: servico.nome, cliente: cliente, telefone: telefone, extras: extras });
    return { agendamento: { id: id, data: data, hora: hora, duracao: servico.duracao, servico: servico.nome, cliente: cliente, status: 'Agendado' } };
  } finally {
    lock.releaseLock();
  }
}

/** Recupera pelo telefone + nome de quem agendou. Devolve só o essencial. */
function acaoBuscar(req) {
  const telefone = soDigitos(req.telefone);
  const nome = normalizar(req.nome);
  if (telefone.length < 10 || !nome) throw erro('Informe o telefone e o nome usados no agendamento.');
  limitarTentativas('busca_' + telefone, 10, 600);
  const hoje = Utilities.formatDate(new Date(), lerConfig().fuso, 'yyyy-MM-dd');
  const lista = lerAgendamentos().filter(function (a) {
    return a.telefone === telefone && normalizar(a.cliente) === nome && a.data >= hoje && a.status !== 'Cancelado';
  }).map(function (a) {
    return { id: a.id, data: a.data, hora: a.hora, duracao: a.duracao, servico: a.servico, cliente: a.cliente, status: a.status };
  });
  return { agendamentos: lista };
}

/* ============================== ÁREA DA EQUIPE ============================== */

function acaoLogin(req) {
  const usuario = normalizar(req.usuario);
  const senha = String(req.senha || '');
  limitarTentativas('login_' + usuario, 5, 900);
  const linhas = aba(ABAS.admins).getDataRange().getValues().slice(1);
  const admin = linhas.filter(function (l) { return normalizar(l[0]) === usuario && l[4] !== false; })[0];
  if (!admin || gerarHash(admin[2], senha) !== admin[3]) throw erro('Usuário ou senha incorretos.');
  CacheService.getScriptCache().remove('login_' + usuario);
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expira = Date.now() + SESSAO_HORAS * 3600 * 1000;
  aba(ABAS.sessoes).appendRow([token, usuario, expira]);
  limparSessoesVencidas();
  return { token: token, nome: admin[1] || usuario };
}

function acaoLogout(req) {
  const sh = aba(ABAS.sessoes);
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (v[i][0] === req.token) sh.deleteRow(i + 1);
  return {};
}

function acaoListar(req) {
  exigirSessao(req.token);
  const de = req.de ? validarData(req.de, true) : '0000-00-00';
  const ate = req.ate ? validarData(req.ate, true) : '9999-12-31';
  const lista = lerAgendamentos()
    .filter(function (a) { return a.data >= de && a.data <= ate; })
    .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
  return { agendamentos: lista };
}

function acaoStatus(req) {
  exigirSessao(req.token);
  if (STATUS_VALIDOS.indexOf(req.status) === -1) throw erro('Status inválido.');
  const sh = aba(ABAS.agendamentos);
  const cabecalho = lerCabecalho(sh);
  const colId = cabecalho.indexOf('ID') + 1;
  const colStatus = cabecalho.indexOf('Status') + 1;
  const total = Math.max(sh.getLastRow() - 1, 1);
  const ids = sh.getRange(2, colId, total, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === req.id) {
      sh.getRange(i + 2, colStatus).setValue(req.status);
      return { id: req.id, status: req.status };
    }
  }
  throw erro('Agendamento não encontrado.');
}

/* ============================== SERVIÇOS E CATEGORIAS (PAINEL) ============================== */

const MAX_FOTO_BYTES = 1024 * 1024;

function acaoServicos(req) {
  exigirSessao(req.token);
  return { servicos: lerServicos(true), categorias: lerCategorias() };
}

function lerCategorias() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.categorias);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(function (l) { return String(l[0]).trim(); }).filter(Boolean);
}

function acaoSalvarServico(req) {
  exigirSessao(req.token);
  const s = req.servico || {};
  const nome = texto(s.nome, 'Nome do serviço', 80);
  const duracao = Number(s.duracao);
  if (!(duracao >= 5 && duracao <= 600)) throw erro('Informe a duração em minutos.');
  const categoria = String(s.categoria || '').trim();
  if (categoria && lerCategorias().indexOf(categoria) === -1) throw erro('Essa categoria não existe mais. Escolha outra.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = aba(ABAS.servicos);
    const id = String(s.id || '') || gerarIdServico(nome);
    const linha = linhaPorId(sh, id);
    const anterior = linha > 0 ? sh.getRange(linha, 1, 1, 10).getDisplayValues()[0] : null;
    let foto = String(s.foto || (anterior ? anterior[6] : '')).slice(0, 500);
    let fotoId = anterior ? anterior[9] : '';
    if (req.foto && req.foto.base64) {
      const bytes = Utilities.base64Decode(req.foto.base64);
      if (bytes.length > MAX_FOTO_BYTES) throw erro('A foto está grande demais. Escolha outra imagem.');
      const tipo = req.foto.tipo === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const arquivo = pastaDeFotos().createFile(Utilities.newBlob(bytes, tipo, id + (tipo === 'image/webp' ? '.webp' : '.jpg')));
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      if (fotoId) apagarFoto(fotoId);
      fotoId = arquivo.getId();
      foto = 'https://lh3.googleusercontent.com/d/' + fotoId + '=w1000';
    } else if (!s.foto && fotoId) {
      apagarFoto(fotoId); fotoId = ''; foto = '';
    }
    const valores = [[id, nome, String(s.descricao || '').slice(0, 300), String(duracao), String(s.preco || '').slice(0, 40),
      String(s.icone || '').slice(0, 20), foto, categoria, s.ativo === false ? 'Não' : 'Sim', fotoId]];
    if (linha > 0) sh.getRange(linha, 1, 1, 10).setValues(valores);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, 10).setValues(valores);
    return { servico: { id: id, nome: nome, descricao: valores[0][2], duracao: duracao, preco: valores[0][4], icone: valores[0][5], foto: foto, categoria: categoria, ativo: s.ativo !== false } };
  } finally {
    lock.releaseLock();
  }
}

function acaoExcluirServico(req) {
  exigirSessao(req.token);
  const sh = aba(ABAS.servicos);
  const linha = linhaPorId(sh, String(req.id || ''));
  if (linha < 0) return {};
  const fotoId = sh.getRange(linha, 10).getDisplayValue();
  if (fotoId) apagarFoto(fotoId);
  sh.deleteRow(linha);
  return {};
}

function acaoCriarCategoria(req) {
  exigirSessao(req.token);
  const nome = String(req.nome || '').trim().replace(/\s+/g, ' ');
  if (nome.length < 2 || nome.length > 40) throw erro('Digite o nome da categoria, com até 40 caracteres.');
  if (lerCategorias().some(function (c) { return normalizar(c) === normalizar(nome); })) throw erro('Essa categoria já existe.');
  aba(ABAS.categorias).appendRow([nome]);
  return {};
}

function acaoExcluirCategoria(req) {
  exigirSessao(req.token);
  const nome = String(req.nome || '');
  const emUso = lerServicos(true).filter(function (s) { return s.categoria === nome; }).length;
  if (emUso) throw erro('Esta categoria tem ' + emUso + (emUso === 1 ? ' serviço' : ' serviços') + '. Mude a categoria deles antes de excluir.');
  const sh = aba(ABAS.categorias);
  const v = sh.getDataRange().getDisplayValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]).trim() === nome) sh.deleteRow(i + 1);
  return {};
}

function linhaPorId(sh, id) {
  if (!id || sh.getLastRow() < 2) return -1;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function gerarIdServico(nome) {
  const base = normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'servico';
  return base + '-' + Utilities.getUuid().slice(0, 4);
}

function pastaDeFotos() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_FOTOS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ } }
  const pasta = DriveApp.createFolder('Fotos dos serviços — ' + SpreadsheetApp.getActiveSpreadsheet().getName());
  props.setProperty('PASTA_FOTOS', pasta.getId());
  return pasta;
}

/** Só apaga fotos da pasta do site: nunca uma imagem que a loja colou de outro lugar. */
function apagarFoto(id) {
  try {
    const arquivo = DriveApp.getFileById(id);
    const pasta = PropertiesService.getScriptProperties().getProperty('PASTA_FOTOS');
    const pais = arquivo.getParents();
    while (pais.hasNext()) if (pais.next().getId() === pasta) { arquivo.setTrashed(true); return; }
  } catch (e) { /* já removida */ }
}

/* ============================== BLOQUEIOS (PAINEL) ============================== */

function lerBloqueios() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABAS.bloqueios);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 7).getDisplayValues().filter(function (l) { return l[0]; }).map(function (l) {
    const semanal = normalizar(l[1]) === 'semanal';
    return { id: l[0], tipo: semanal ? 'semanal' : 'dia', data: semanal ? '' : l[2], diaSemana: semanal ? DIAS_SEMANA.indexOf(normalizarDia(l[3])) : undefined, inicio: l[4] || '00:00', fim: l[5] || '24:00', motivo: l[6] };
  });
}
function normalizarDia(v) {
  const n = normalizar(v);
  for (let i = 0; i < DIAS_SEMANA.length; i++) if (normalizar(DIAS_SEMANA[i]).indexOf(n.slice(0, 3)) === 0) return DIAS_SEMANA[i];
  return n;
}
function bloqueiosDoDia(data) {
  const p = data.split('-').map(Number);
  const dia = new Date(p[0], p[1] - 1, p[2]).getDay();
  return lerBloqueios().filter(function (b) { return b.tipo === 'semanal' ? b.diaSemana === dia : b.data === data; });
}
function acaoBloqueios(req) {
  exigirSessao(req.token);
  return { bloqueios: lerBloqueios() };
}
function acaoCriarBloqueio(req) {
  exigirSessao(req.token);
  const b = req.bloqueio || {};
  const tipo = b.tipo === 'semanal' ? 'semanal' : 'dia';
  const hora = /^([01]\d|2[0-4]):[0-5]\d$/;
  if (!hora.test(String(b.inicio)) || !hora.test(String(b.fim)) || b.inicio >= b.fim) throw erro('Confira o início e o fim do bloqueio.');
  if (tipo === 'dia') validarData(b.data, true);
  const dia = Number(b.diaSemana);
  if (tipo === 'semanal' && !(dia >= 0 && dia <= 6)) throw erro('Escolha o dia da semana.');
  const id = 'BLQ-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  const shb = aba(ABAS.bloqueios);
  shb.getRange('A:G').setNumberFormat('@'); // texto puro: o Google não vira 14:00 em hora
  shb.appendRow([id, tipo === 'semanal' ? 'Semanal' : 'Dia', tipo === 'dia' ? b.data : '', tipo === 'semanal' ? DIAS_SEMANA[dia] : '', b.inicio, b.fim, String(b.motivo || '').slice(0, 80)]);
  return { bloqueio: { id: id, tipo: tipo, data: tipo === 'dia' ? b.data : '', diaSemana: tipo === 'semanal' ? dia : undefined, inicio: b.inicio, fim: b.fim, motivo: b.motivo || '' } };
}
function acaoExcluirBloqueio(req) {
  exigirSessao(req.token);
  const sh = aba(ABAS.bloqueios);
  const v = sh.getDataRange().getDisplayValues();
  for (let i = v.length - 1; i >= 1; i--) if (v[i][0] === req.id) sh.deleteRow(i + 1);
  return {};
}
function duracaoDoServico(nome) {
  const s = lerServicos(true).filter(function (x) { return x.nome === nome; })[0];
  return s ? s.duracao : 60;
}

/* ============================== LEITURA ============================== */

function lerCabecalho(sh) {
  return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues()[0];
}

function lerAgendamentos() {
  const sh = aba(ABAS.agendamentos);
  const total = sh.getLastRow() - 1;
  if (total < 1) return [];
  const cabecalho = lerCabecalho(sh);
  const linhas = sh.getRange(2, 1, total, cabecalho.length).getDisplayValues();
  const fixas = COL_INICIO.concat(COL_FIM);
  return linhas.filter(function (l) { return l[0]; }).map(function (l) {
    const obj = {};
    cabecalho.forEach(function (h, i) { obj[h] = l[i]; });
    const extras = cabecalho.filter(function (h) { return h && fixas.indexOf(h) === -1; })
      .map(function (h) { return { rotulo: h, valor: obj[h] }; })
      .filter(function (x) { return x.valor; });
    return {
      id: obj['ID'], criadoEm: obj['Criado em'], data: obj['Data'], hora: obj['Hora'],
      servico: obj['Serviço'], cliente: obj['Cliente'], telefone: soDigitos(obj['Telefone']),
      obs: obj['Observações'], status: obj['Status'] === 'Cancelado' ? 'Cancelado' : 'Agendado', extras: extras,
      duracao: Number(obj['Duração (min)']) || duracaoDoServico(obj['Serviço']),
    };
  });
}

function contarPorHora(data) {
  const cont = {};
  lerAgendamentos().forEach(function (a) {
    if (a.data === data && a.status !== 'Cancelado') cont[a.hora] = (cont[a.hora] || 0) + 1;
  });
  return cont;
}

function lerServicos(todos) {
  return aba(ABAS.servicos).getDataRange().getDisplayValues().slice(1)
    .filter(function (l) { return l[0] && (todos || !eNao(l[8])); })
    .map(function (l) {
      return { id: l[0], nome: l[1], descricao: l[2], duracao: Number(l[3]) || 60, preco: l[4], icone: l[5], foto: l[6], categoria: l[7], ativo: !eNao(l[8]) };
    });
}

function lerCampos() {
  return aba(ABAS.campos).getDataRange().getDisplayValues().slice(1)
    .filter(function (l) { return l[0] && l[1] && !eNao(l[5]); })
    .map(function (l) {
      return {
        id: l[0], rotulo: l[1], tipo: (l[2] || 'texto').toLowerCase(),
        opcoes: String(l[3] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
        obrigatorio: !eNao(l[4]),
      };
    });
}

function lerConfig() {
  const cache = CacheService.getScriptCache();
  const salvo = cache.get('config');
  if (salvo) return JSON.parse(salvo);
  const mapa = {};
  aba(ABAS.config).getDataRange().getDisplayValues().slice(1).forEach(function (l) { mapa[l[0]] = l[1]; });
  const c = {
    abre: mapa.abre || '08:00',
    fecha: mapa.fecha || '18:00',
    intervalo_min: Number(mapa.intervalo_min) || 60,
    vagas_por_horario: Number(mapa.vagas_por_horario) || 1,
    dias_fechados: String(mapa.dias_fechados || '0').split(',').map(function (x) { return Number(x.trim()); }).filter(function (x) { return !isNaN(x); }),
    dias_antecedencia: Number(mapa.dias_antecedencia) || 30,
    dias_guardar: Number(mapa.dias_guardar) || 3,
    email_aviso: mapa.email_aviso || '',
    whatsapp: mapa.whatsapp || '',
    endereco: mapa.endereco || '',
    instagram: mapa.instagram || '',
    fuso: mapa.fuso || TZ_PADRAO,
    nome_loja: mapa.nome_loja || 'Salão',
  };
  cache.put('config', JSON.stringify(c), 120);
  return c;
}

/* ============================== AJUDANTES ============================== */

function aba(nome) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!sh) throw erro('Planilha não preparada. Use o menu "🐾 Agenda do site".');
  return sh;
}

/** "Não" e "Falso" desligam; vazio e qualquer outra coisa ligam. */
function eNao(v) {
  const s = normalizar(v);
  return s === 'nao' || s === 'false' || s === 'n';
}

function gerarHorarios(c) {
  const lista = [];
  const ini = c.abre.split(':').map(Number);
  const fim = c.fecha.split(':').map(Number);
  for (let m = ini[0] * 60 + ini[1]; m + c.intervalo_min <= fim[0] * 60 + fim[1]; m += c.intervalo_min) {
    lista.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
  }
  return lista;
}

function diaFechado(data, c) {
  const p = data.split('-').map(Number);
  const dia = new Date(p[0], p[1] - 1, p[2]).getDay();
  return c.dias_fechados.indexOf(dia) !== -1;
}

function validarData(data, livre) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) throw erro('Data inválida.');
  if (livre) return data;
  const c = lerConfig();
  const hoje = Utilities.formatDate(new Date(), c.fuso, 'yyyy-MM-dd');
  const limite = Utilities.formatDate(new Date(Date.now() + c.dias_antecedencia * 86400000), c.fuso, 'yyyy-MM-dd');
  if (data < hoje) throw erro('Essa data já passou.');
  if (data > limite) throw erro('Ainda não abrimos agenda para essa data.');
  return data;
}

function exigirSessao(token) {
  if (!token) throw erro('Faça login de novo.');
  const v = aba(ABAS.sessoes).getDataRange().getValues().slice(1);
  const s = v.filter(function (l) { return l[0] === token; })[0];
  if (!s || Number(s[2]) < Date.now()) throw erro('Sessão expirada. Faça login de novo.');
  return s[1];
}

function limparSessoesVencidas() {
  const sh = aba(ABAS.sessoes);
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (Number(v[i][2]) < Date.now()) sh.deleteRow(i + 1);
}

function limitarTentativas(chave, max, segundos) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(chave) || 0);
  if (n >= max) throw erro('Muitas tentativas. Espere alguns minutos e tente de novo.');
  cache.put(chave, String(n + 1), segundos);
}

function gerarHash(salt, senha) {
  let h = salt + ':' + senha;
  for (let i = 0; i < 2000; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function avisarDono(c, a) {
  if (!c.email_aviso) return;
  try {
    const extras = Object.keys(a.extras).map(function (k) { return k + ': ' + a.extras[k]; }).join('\n');
    MailApp.sendEmail({
      to: c.email_aviso,
      name: c.nome_loja || 'Agenda do site',
      subject: 'Novo agendamento: ' + a.cliente + ' — ' + a.data.split('-').reverse().join('/') + ' ' + a.hora,
      body: 'Novo agendamento pelo site.\n\nServiço: ' + a.servico + '\nCliente: ' + a.cliente + '\nWhatsApp: ' + a.telefone +
        (extras ? '\n' + extras : '') + '\nCódigo: ' + a.id,
    });
  } catch (e) { /* o aviso por e-mail é opcional */ }
}

function texto(v, campo, max) {
  const s = String(v || '').trim();
  if (!s) throw erro('Preencha: ' + campo + '.');
  return s.slice(0, max);
}
function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }
function normalizar(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ============================== LIMPEZA AUTOMÁTICA ============================== */

/**
 * Apaga da aba Agendamentos tudo cuja data do serviço já passou há mais dias do que
 * o `dias_guardar` da aba Config. Com 3 dias: o serviço do dia 17 some no dia 21.
 * Roda sozinha de madrugada depois que "1. Preparar a planilha" é executado.
 */
function limparAgendamentosAntigos() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const c = lerConfig();
    const sh = aba(ABAS.agendamentos);
    const total = sh.getLastRow() - 1;
    if (total < 1) return 0;
    const colunas = Math.max(sh.getLastColumn(), 1);
    const colData = lerCabecalho(sh).indexOf('Data');
    if (colData === -1) return 0;
    const limite = Utilities.formatDate(new Date(Date.now() - c.dias_guardar * 86400000), c.fuso, 'yyyy-MM-dd');
    const linhas = sh.getRange(2, 1, total, colunas).getDisplayValues();
    const manter = linhas.filter(function (l) { return l[0] && !(l[colData] && l[colData] < limite); });
    const apagados = total - manter.length;
    if (apagados === 0) return 0;
    // Reescreve de uma vez: bem mais rápido que apagar linha por linha.
    sh.getRange(2, 1, total, colunas).clearContent();
    if (manter.length) sh.getRange(2, 1, manter.length, colunas).setValues(manter);
    Logger.log('Apagados ' + apagados + ' agendamentos anteriores a ' + limite + '.');
    return apagados;
  } finally {
    lock.releaseLock();
  }
}

function limparAgora() {
  const n = limparAgendamentosAntigos();
  SpreadsheetApp.getUi().alert(n ? 'Pronto! ' + n + ' agendamento(s) antigo(s) apagado(s).' : 'Nada para apagar por enquanto.');
}

function agendarLimpezaDiaria() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'limparAgendamentosAntigos') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('limparAgendamentosAntigos').timeBased().everyDays(1).atHour(3).create();
}

/* ============================== INSTALAÇÃO ============================== */

/** Cria as abas, os cabeçalhos e os exemplos. Pode rodar de novo sem apagar dados. */
function instalar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(CAB).forEach(function (nome) {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);
    if (sh.getLastRow() === 0) {
      sh.appendRow(CAB[nome]);
      sh.getRange(1, 1, 1, CAB[nome].length).setFontWeight('bold').setBackground('#e8eef5');
      sh.setFrozenRows(1);
    }
  });

  // Agendamentos: colunas fixas + uma coluna por campo do formulário.
  let ag = ss.getSheetByName(ABAS.agendamentos);
  if (!ag) ag = ss.insertSheet(ABAS.agendamentos);
  if (ag.getLastRow() === 0) {
    ag.appendRow(COL_INICIO.concat(COL_FIM));
    ag.getRange(1, 1, 1, COL_INICIO.length + COL_FIM.length).setFontWeight('bold').setBackground('#e8eef5');
    ag.setFrozenRows(1);
  }
  ag.getRange('A:Z').setNumberFormat('@'); // texto puro: o Google não converte data e telefone sozinho

  semearCategorias(ss);
  semearServicos(ss);
  semearCampos(ss);
  semearConfig(ss);
  sincronizarColunas();

  CacheService.getScriptCache().remove('config');
  const padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);

  let aviso = '';
  try { agendarLimpezaDiaria(); } catch (e) { aviso = '\n\n(A limpeza automática não pôde ser agendada: ' + e.message + ')'; }

  SpreadsheetApp.getUi().alert(
    'Planilha pronta!\n\n' +
    'Agora:\n' +
    '1. Confira as abas Config, Servicos e Campos (já vêm com exemplos de salão).\n' +
    '2. Use o menu "2. Criar ou trocar a senha".\n' +
    '3. Publique em Extensões > Apps Script > Implantar > Nova implantação > App da Web.' + aviso);
}

function semearCategorias(ss) {
  const sh = ss.getSheetByName(ABAS.categorias);
  if (sh.getLastRow() !== 1) return;
  sh.getRange('A:A').setNumberFormat('@');
  [['Cabelo'], ['Unhas'], ['Estética']].forEach(function (l) { sh.appendRow(l); });
}

function semearServicos(ss) {
  const sh = ss.getSheetByName(ABAS.servicos);
  if (sh.getLastRow() !== 1) return;
  sh.getRange('A:J').setNumberFormat('@');
  [
    ['corte', 'Corte feminino', 'Lavagem, corte e finalização simples.', '60', 'a partir de R$ 70', 'tesoura', '', 'Cabelo', 'Sim', ''],
    ['corte-escova', 'Corte e escova', 'Corte com escova modelada.', '90', 'a partir de R$ 110', 'secador', '', 'Cabelo', 'Sim', ''],
    ['coloracao', 'Coloração', 'Cor de raiz ou global, com finalização.', '120', 'a partir de R$ 160', 'pincel', '', 'Cabelo', 'Sim', ''],
    ['manicure', 'Manicure', 'Cutilagem, lixamento e esmaltação.', '45', 'R$ 35', 'unhas', '', 'Unhas', 'Sim', ''],
    ['sobrancelha', 'Design de sobrancelha', 'Desenho com pinça e linha.', '30', 'R$ 45', 'olhar', '', 'Estética', 'Sim', ''],
    ['unhas', 'Corte de unhas', 'Corte e lixamento com cuidado.', '30', 'R$ 25', 'patinha', '', 'Cuidados', 'Sim', ''],
  ].forEach(function (l) { sh.appendRow(l); });
  sh.getRange('F1').setNote('Ícone: tesoura, secador, pincel, gota, unhas, olhar, spa, flor, ou um emoji.\nFoto: link de uma imagem (opcional).\nCategoria: um nome da aba Categorias.\nAtivo: "Não" esconde o serviço do site.\nTudo isso também pode ser feito pelo painel do site, em Serviços.');
  sh.hideColumns(10);
}

function semearCampos(ss) {
  const sh = ss.getSheetByName(ABAS.campos);
  if (sh.getLastRow() !== 1) return;
  sh.getRange('A:F').setNumberFormat('@');
  [
    ['profissional', 'Profissional', 'opcoes', 'Sem preferência, Bia, Carol, Lu', 'Sim', 'Sim'],
    ['raca', 'Raça', 'texto', '', 'Não', 'Sim'],
  ].forEach(function (l) { sh.appendRow(l); });
  sh.getRange('A1').setNote(
    'Os campos do formulário além de nome e WhatsApp, que já existem sempre.\n\n' +
    'Tipo: texto (uma linha), longo (caixa grande) ou opcoes (lista).\n' +
    'Opções: separadas por vírgula, só para o tipo "opcoes".\n' +
    'Ex.: profissional | Profissional | opcoes | Sem preferência, Bia, Carol | Sim | Sim\n' +
    '     cabelo | Comprimento do cabelo | opcoes | Curto, Médio, Longo | Não | Sim\n\n' +
    'Depois de mexer aqui, use o menu "Atualizar campos do formulário".');
}

function semearConfig(ss) {
  const sh = ss.getSheetByName(ABAS.config);
  if (sh.getLastRow() !== 1) return;
  sh.getRange('A:C').setNumberFormat('@');
  [
    ['nome_loja', 'Meu Salão', 'Nome do salão, usado no e-mail de aviso'],
    ['abre', '08:00', 'Primeiro horário do dia'],
    ['fecha', '18:00', 'Último atendimento termina até esse horário'],
    ['intervalo_min', '60', 'Minutos entre um horário e outro'],
    ['vagas_por_horario', '2', 'Quantas clientes podem ser atendidas ao mesmo tempo (normalmente, o número de profissionais)'],
    ['dias_fechados', '0', 'Dias sem atendimento: 0=domingo, 1=segunda ... 6=sábado. Ex: 0,1'],
    ['dias_antecedencia', '30', 'Até quantos dias pra frente aceita agendamento'],
    ['dias_guardar', '3', 'Quantos dias o agendamento fica guardado depois do atendimento (some sozinho)'],
    ['email_aviso', '', 'E-mail que recebe aviso de novo agendamento (vazio = não avisa)'],
    ['whatsapp', '', 'WhatsApp com DDI+DDD, só números. Ex: 5534999999999'],
    ['endereco', '', 'Endereço que aparece no site'],
    ['instagram', '', 'Usuário do Instagram, sem o @'],
    ['fuso', TZ_PADRAO, 'Fuso horário'],
  ].forEach(function (l) { sh.appendRow(l); });
}

/** Cria na aba Agendamentos uma coluna para cada campo novo do formulário. */
function sincronizarColunas() {
  const sh = aba(ABAS.agendamentos);
  const cabecalho = lerCabecalho(sh);
  const novos = lerCampos().filter(function (c) { return cabecalho.indexOf(c.rotulo) === -1; });
  if (!novos.length) return 0;
  let pos = cabecalho.indexOf('Observações');
  if (pos === -1) pos = cabecalho.length;
  novos.forEach(function (campo) {
    sh.insertColumnBefore(pos + 1);
    sh.getRange(1, pos + 1).setValue(campo.rotulo).setFontWeight('bold').setBackground('#e8eef5');
    pos++;
  });
  return novos.length;
}

function atualizarCampos() {
  const n = sincronizarColunas();
  CacheService.getScriptCache().remove('config');
  SpreadsheetApp.getUi().alert(n
    ? n + ' coluna(s) criada(s) na aba Agendamentos.'
    : 'Tudo certo: a aba Agendamentos já tem uma coluna para cada campo.');
}

/** Cria ou troca a senha de quem entra na área da equipe. */
function criarSenha() {
  const ui = SpreadsheetApp.getUi();
  const u = ui.prompt('Área da equipe', 'Nome de usuário (sem espaços, ex.: maria):', ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK) return;
  const usuario = u.getResponseText().trim();
  if (!usuario) return ui.alert('Usuário em branco. Nada foi feito.');

  const s = ui.prompt('Área da equipe', 'Senha para "' + usuario + '" (mínimo 8 caracteres):', ui.ButtonSet.OK_CANCEL);
  if (s.getSelectedButton() !== ui.Button.OK) return;
  const senha = s.getResponseText();
  if (senha.length < 8) return ui.alert('Senha curta demais. Use pelo menos 8 caracteres.');

  const n = ui.prompt('Área da equipe', 'Nome que aparece no painel (ex.: Maria):', ui.ButtonSet.OK_CANCEL);
  const nome = n.getSelectedButton() === ui.Button.OK && n.getResponseText().trim() ? n.getResponseText().trim() : usuario;

  const sh = aba(ABAS.admins);
  const salt = Utilities.getUuid();
  const hash = gerarHash(salt, senha);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (normalizar(v[i][0]) === normalizar(usuario)) {
      sh.getRange(i + 1, 1, 1, 5).setValues([[usuario, nome, salt, hash, true]]);
      return ui.alert('Senha atualizada para "' + usuario + '".');
    }
  }
  sh.appendRow([usuario, nome, salt, hash, true]);
  ui.alert('Pronto! Entre no site com o usuário "' + usuario + '" e essa senha.\n\nA planilha guarda só uma versão embaralhada da senha, nunca a senha em si.');
}

/** Mostra o endereço do App da Web, que é o que o site precisa. */
function mostrarDados() {
  const ui = SpreadsheetApp.getUi();
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { /* ainda não publicado */ }
  ui.alert('Dados para o site',
    url
      ? 'Endereço da API (mande para quem monta o site):\n\n' + url
      : 'Ainda não publicado.\n\nVá em Extensões > Apps Script > Implantar > Nova implantação > App da Web,\n' +
        'com "Executar como: Eu" e "Quem pode acessar: Qualquer pessoa".\nDepois volte aqui.',
    ui.ButtonSet.OK);
}
