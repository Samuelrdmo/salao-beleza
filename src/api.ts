import { client, demoMode, presentation, sheetsUrl } from './config';
import { demoBlocks, demoBookings, demoCategories, demoFields, demoHours, demoLogin, demoServices, demoSlotsPerHour } from './demo';
import { calcularHorarios, idDoServico, iso, normalizar, sameText, soDigitos, statusNormal } from './domain';
import type { Block, Booking, Service, SiteConfig, Slot, Status } from './domain';
import { blobDataUrl } from './images';

/*
 * Duas fontes de dados com a mesma interface:
 * - Planilha do Google (sheetsApiUrl no client.json): o Apps Script em google-sheets/Code.gs.
 * - Navegador (sem planilha): salão de demonstração guardado no localStorage.
 */

async function call<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (demoMode) return demo(action, data) as Promise<T>;
  let response: Response;
  try {
    // Sem Content-Type de propósito: o navegador não faz a verificação prévia que o Apps Script não responde.
    response = await fetch(sheetsUrl, { method: 'POST', body: JSON.stringify({ action, ...data }) });
  } catch { throw new Error('Sem conexão. Confira sua internet e tente de novo.'); }
  const json = await response.json().catch(() => ({ ok: false, erro: 'Resposta inválida do servidor.' }));
  if (!json.ok) throw new Error(json.erro || 'Algo deu errado. Tente de novo.');
  return json as T;
}

// ---------- Site ----------
let configCache: Promise<SiteConfig> | null = null;
export function loadConfig(): Promise<SiteConfig> {
  configCache ??= call<SiteConfig>('config').catch(e => { configCache = null; throw e; });
  return configCache;
}
/** Horários livres do dia para o serviço escolhido (a duração do serviço conta). */
export const availability = (data: string, servico: string) => call<{ horarios: Slot[]; fechado: boolean }>('disponibilidade', { data, servico });
export type NewBooking = { nome: string; telefone: string; obs: string; servico: string; data: string; hora: string; campos: Record<string, string> };
export const book = (dados: NewBooking) => call<{ agendamento: Booking }>('agendar', dados);
export const findBookings = (telefone: string, nome: string) => call<{ agendamentos: Booking[] }>('buscar', { telefone, nome });

// ---------- Último agendamento guardado no aparelho ----------
const MINE_KEY = `agenda-${client.slug}-meu`;
export function rememberBooking(b: Booking & { detalhe?: string }) {
  try { localStorage.setItem(MINE_KEY, JSON.stringify(b)); } catch { /* sem storage: segue sem lembrar */ }
}
export function rememberedBooking(): (Booking & { detalhe?: string }) | null {
  try {
    const b = JSON.parse(localStorage.getItem(MINE_KEY) || 'null');
    if (!b || b.data < iso(new Date())) { localStorage.removeItem(MINE_KEY); return null; }
    return b;
  } catch { return null; }
}
export function forgetBooking() { try { localStorage.removeItem(MINE_KEY); } catch { /* ignora */ } }

// ---------- Painel ----------
const SESSION_KEY = `agenda-${client.slug}-sessao`;
export type Session = { token: string; nome: string };
export function currentSession(): Session | null {
  if (presentation) return { token: 'demo-token', nome: demoLogin.nome };
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export async function login(usuario: string, senha: string): Promise<Session> {
  const r = await call<Session>('login', { usuario, senha });
  const session = { token: r.token, nome: r.nome };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* sessão só nesta aba */ }
  return session;
}
export async function logout(session: Session) {
  call('logout', { token: session.token }).catch(() => {});
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignora */ }
}
export const listBookings = (token: string, de: string, ate: string) => call<{ agendamentos: Booking[] }>('listar', { token, de, ate });
export const setStatus = (token: string, id: string, status: Status) => changed(call('status', { token, id, status }));

// ---------- Painel: bloqueios ----------
export const listBlocks = (token: string) => call<{ bloqueios: Block[] }>('bloqueios', { token });
export const saveBlock = (token: string, bloqueio: Omit<Block, 'id'>) => changed(call<{ bloqueio: Block }>('criarBloqueio', { token, bloqueio }));
export const deleteBlock = (token: string, id: string) => changed(call('excluirBloqueio', { token, id }));

// ---------- Painel: serviços e categorias ----------
export type Catalog = { servicos: Service[]; categorias: string[] };
/** Todos os serviços, inclusive os escondidos do site. */
export const adminServices = (token: string) => call<Catalog>('servicos', { token });
async function changed<T>(p: Promise<T>) { const r = await p; configCache = null; return r; }
export async function saveService(token: string, servico: Service, foto?: Blob | null) {
  let payload: { base64: string; tipo: string } | undefined;
  if (foto) { const url = await blobDataUrl(foto); payload = { base64: url.slice(url.indexOf(',') + 1), tipo: foto.type }; }
  return changed(call<{ servico: Service }>('salvarServico', { token, servico, foto: payload }));
}
export const deleteService = (token: string, id: string) => changed(call('excluirServico', { token, id }));
export const createCategory = (token: string, nome: string) => changed(call('criarCategoria', { token, nome }));
export const deleteCategory = (token: string, nome: string) => changed(call('excluirCategoria', { token, nome }));
export const demoCredentials = demoMode && !presentation ? demoLogin : null;

// ---------- Demonstração no navegador ----------
const DEMO_KEY = `agenda-${client.slug}-demo-agendamentos-v2`;
const BLOCKS_KEY = `agenda-${client.slug}-demo-bloqueios`;
function readDemo(): Booking[] {
  try { const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); if (Array.isArray(saved)) return saved; } catch { /* recomeça */ }
  const initial = demoBookings(); storeDemo(initial); return initial;
}
function storeDemo(list: Booking[]) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch { /* sem storage */ } }
function readBlocks(): Block[] {
  try { const saved = JSON.parse(localStorage.getItem(BLOCKS_KEY) || 'null'); if (Array.isArray(saved)) return saved; } catch { /* recomeça */ }
  const initial = demoBlocks(); storeBlocks(initial); return initial;
}
function storeBlocks(list: Block[]) { try { localStorage.setItem(BLOCKS_KEY, JSON.stringify(list)); } catch { /* sem storage */ } }
const SERVICES_KEY = `agenda-${client.slug}-demo-servicos`;
function readCatalog(): Catalog {
  try { const saved = JSON.parse(localStorage.getItem(SERVICES_KEY) || 'null'); if (saved?.servicos && saved?.categorias) return saved; } catch { /* recomeça */ }
  return { servicos: structuredClone(demoServices), categorias: [...demoCategories] };
}
function storeCatalog(c: Catalog) {
  try { localStorage.setItem(SERVICES_KEY, JSON.stringify(c)); }
  catch { throw new Error('O armazenamento deste navegador está cheio. Use uma foto menor.'); }
}
export function resetDemo() { try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(SERVICES_KEY); localStorage.removeItem(BLOCKS_KEY); } catch { /* ignora */ } configCache = null; }

async function demo(action: string, d: Record<string, unknown>): Promise<unknown> {
  await new Promise(r => setTimeout(r, 350));
  const list = readDemo();
  const servicoAtivo = (id: unknown) => readCatalog().servicos.find(s => s.id === id && s.ativo !== false);
  const livres = (data: string, duracao: number) => calcularHorarios({ data, horarios: demoHours, agendamentos: list, bloqueios: readBlocks(), vagas: demoSlotsPerHour, duracao });
  const auth = () => { if (d.token !== 'demo-token') throw new Error('Sessão expirada. Entre de novo.'); };
  switch (action) {
    case 'config': {
      const c = readCatalog();
      // O site recebe só quando cada bloqueio vale, sem o motivo.
      const bloqueios = readBlocks().map(({ motivo: _motivo, ...b }) => b);
      return { ok: true, servicos: c.servicos.filter(s => s.ativo !== false), categorias: c.categorias, bloqueios, campos: demoFields, horarios: demoHours, contato: { whatsapp: client.contact.whatsapp, endereco: client.contact.endereco, instagram: client.contact.instagram }, nome: client.brand.fullName };
    }
    case 'servicos': auth(); return { ok: true, ...readCatalog() };
    case 'salvarServico': {
      auth();
      const c = readCatalog(); const s = d.servico as Service; const foto = d.foto as { base64: string; tipo: string } | undefined;
      if (!String(s?.nome || '').trim()) throw new Error('Preencha o nome do serviço.');
      const saved: Service = { ...s, id: s.id || idDoServico(s.nome), nome: s.nome.trim(), foto: foto ? `data:${foto.tipo};base64,${foto.base64}` : s.foto || '' };
      const i = c.servicos.findIndex(x => x.id === saved.id);
      if (i >= 0) c.servicos[i] = saved; else c.servicos.push(saved);
      storeCatalog(c); return { ok: true, servico: saved };
    }
    case 'excluirServico': { auth(); const c = readCatalog(); storeCatalog({ ...c, servicos: c.servicos.filter(s => s.id !== d.id) }); return { ok: true }; }
    case 'criarCategoria': {
      auth(); const c = readCatalog(); const nome = String(d.nome || '').trim();
      if (c.categorias.some(x => sameText(x, nome))) throw new Error('Essa categoria já existe.');
      storeCatalog({ ...c, categorias: [...c.categorias, nome] }); return { ok: true };
    }
    case 'excluirCategoria': {
      auth(); const c = readCatalog(); const usados = c.servicos.filter(s => s.categoria === d.nome).length;
      if (usados) throw new Error(`Esta categoria tem ${usados} ${usados === 1 ? 'serviço' : 'serviços'}. Mude a categoria deles antes de excluir.`);
      storeCatalog({ ...c, categorias: c.categorias.filter(x => x !== d.nome) }); return { ok: true };
    }
    case 'disponibilidade': {
      const servico = servicoAtivo(d.servico);
      return { ok: true, fechado: false, horarios: livres(String(d.data), servico?.duracao || 60) };
    }
    case 'bloqueios': auth(); return { ok: true, bloqueios: readBlocks() };
    case 'criarBloqueio': {
      auth(); const b = d.bloqueio as Omit<Block, 'id'>;
      if (b.tipo === 'dia' && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.data))) throw new Error('Escolha a data do bloqueio.');
      if (b.inicio >= b.fim) throw new Error('O fim do bloqueio precisa ser depois do início.');
      const novo: Block = { ...b, id: 'BLQ-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
      storeBlocks([...readBlocks(), novo]); return { ok: true, bloqueio: novo };
    }
    case 'excluirBloqueio': auth(); storeBlocks(readBlocks().filter(b => b.id !== d.id)); return { ok: true };
    case 'agendar': {
      const telefone = soDigitos(d.telefone);
      if (!String(d.nome || '').trim() || !d.servico || !d.data || !d.hora) throw new Error('Preencha todos os campos.');
      if (telefone.length < 10) throw new Error('Telefone inválido. Use DDD + número.');
      const campos = (d.campos || {}) as Record<string, string>;
      for (const f of demoFields) if (f.obrigatorio && !String(campos[f.id] || '').trim()) throw new Error(`Preencha: ${f.rotulo}.`);
      const servico = servicoAtivo(d.servico);
      if (!servico) throw new Error('Escolha um serviço.');
      if (!livres(String(d.data), servico.duracao).find(x => x.hora === d.hora)?.livre) throw new Error('Esse horário acabou de ser preenchido. Escolha outro.');
      const novo: Booking = {
        id: 'A' + Math.random().toString(16).slice(2, 8).toUpperCase(), data: String(d.data), hora: String(d.hora), servico: servico.nome,
        cliente: String(d.nome).trim(), telefone, obs: String(d.obs || ''), status: 'Agendado', duracao: servico.duracao,
        extras: demoFields.map(f => ({ rotulo: f.rotulo, valor: String(campos[f.id] || '').trim() })).filter(x => x.valor),
      };
      storeDemo([...list, novo]);
      return { ok: true, agendamento: { id: novo.id, data: novo.data, hora: novo.hora, duracao: novo.duracao, servico: novo.servico, cliente: novo.cliente, status: novo.status } };
    }
    case 'buscar': {
      const telefone = soDigitos(d.telefone); const hoje = iso(new Date());
      return { ok: true, agendamentos: list.filter(a => a.telefone === telefone && normalizar(a.cliente) === normalizar(d.nome) && a.data >= hoje && a.status !== 'Cancelado').map(({ id, data, hora, servico, cliente, status }) => ({ id, data, hora, servico, cliente, status })) };
    }
    case 'login':
      if (normalizar(d.usuario) === demoLogin.usuario && d.senha === demoLogin.senha) return { ok: true, token: 'demo-token', nome: demoLogin.nome };
      throw new Error(`Usuário ou senha incorretos. Na demonstração use ${demoLogin.usuario} / ${demoLogin.senha}.`);
    case 'logout': return { ok: true };
    case 'listar': {
      auth(); const de = String(d.de || '0000'); const ate = String(d.ate || '9999');
      return { ok: true, agendamentos: list.filter(a => a.data >= de && a.data <= ate).map(a => ({ ...a, status: statusNormal(a.status) })).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)) };
    }
    case 'status':
      auth(); storeDemo(list.map(a => a.id === d.id ? { ...a, status: d.status as Status } : a));
      return { ok: true };
    default: throw new Error('Ação inválida.');
  }
}
