/* Regras do agendamento, sem dependência do navegador (testadas em domain.test.ts). */

export type Service = { id: string; nome: string; descricao: string; duracao: number; preco: string; icone: string; foto?: string; categoria?: string; ativo?: boolean };
/** Ícones que o painel oferece (o site também aceita um emoji). */
export const SERVICE_ICONS = ['tesoura', 'secador', 'pincel', 'gota', 'unhas', 'olhar', 'spa', 'flor'] as const;
export const DURACOES = [15, 30, 45, 60, 90, 120, 150, 180, 240];
export const SEM_CATEGORIA = 'Outros serviços';

/** Serviços agrupados na ordem das categorias; os sem categoria (ou de categoria apagada) vão para o fim. */
export function agruparPorCategoria(servicos: Service[], categorias: string[]) {
  const grupos = categorias.map(categoria => ({ categoria, servicos: servicos.filter(s => s.categoria === categoria) }));
  const soltos = servicos.filter(s => !s.categoria || !categorias.includes(s.categoria));
  if (soltos.length) grupos.push({ categoria: SEM_CATEGORIA, servicos: soltos });
  return grupos.filter(g => g.servicos.length);
}
export const sameText = (a: string, b: string) => normalizar(a) === normalizar(b);
export function nomeCategoria(valor: string): string | null {
  const nome = valor.trim().replace(/\s+/g, ' ');
  return nome.length >= 2 && nome.length <= 40 ? nome : null;
}
export function idDoServico(nome: string) {
  const base = normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'servico';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
export type Field = { id: string; rotulo: string; tipo: 'texto' | 'longo' | 'opcoes'; opcoes: string[]; obrigatorio: boolean };
export type Hours = { abre: string; fecha: string; intervalo: number; diasFechados: number[]; antecedencia: number };
export type Contact = { whatsapp: string; endereco: string; instagram: string };
/** Não existe confirmação: todo agendamento já entra marcado. A equipe só pode desmarcar. */
export type Status = 'Agendado' | 'Cancelado';
/** Planilhas antigas podiam ter Pendente/Confirmado/Concluído: tudo que não é Cancelado vale como Agendado. */
export const statusNormal = (s: unknown): Status => String(s) === 'Cancelado' ? 'Cancelado' : 'Agendado';
export type Booking = {
  id: string; data: string; hora: string; servico: string; cliente: string; status: Status;
  /** Minutos que o atendimento ocupa na agenda. */
  duracao?: number;
  telefone?: string; obs?: string; extras?: { rotulo: string; valor: string }[];
};
export type Slot = { hora: string; livre: boolean };
/** Horário travado pela equipe: só num dia ("dia") ou toda semana no mesmo dia da semana ("semanal"). */
export type Block = { id: string; tipo: 'dia' | 'semanal'; data?: string; diaSemana?: number; inicio: string; fim: string; motivo?: string };
export const DIA_INTEIRO = { inicio: '00:00', fim: '24:00' } as const;
export type SiteConfig = { servicos: Service[]; categorias?: string[]; campos: Field[]; horarios: Hours; contato: Contact; nome?: string; bloqueios?: Block[] };

const pad = (n: number) => String(n).padStart(2, '0');
/** Data local no formato da planilha: 2026-11-23. */
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const horaAgora = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function paraData(isoStr: string) { const [a, m, d] = isoStr.split('-').map(Number); return new Date(a, m - 1, d); }

/** Horários de início entre abertura e fechamento: o último termina até o fechamento. */
export function gerarHorarios({ abre, fecha, intervalo }: Pick<Hours, 'abre' | 'fecha' | 'intervalo'>): string[] {
  const [ha, ma] = abre.split(':').map(Number);
  const [hf, mf] = fecha.split(':').map(Number);
  const passo = Math.max(5, Number(intervalo) || 60);
  const lista: string[] = [];
  for (let m = ha * 60 + ma; m + passo <= hf * 60 + mf; m += passo) lista.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return lista;
}

/** Próximos dias que aparecem para escolher. Hoje some quando o último horário já passou; dias travados inteiros ficam fechados. */
export function diasDisponiveis(h: Hours, agora = new Date(), bloqueios: Block[] = []) {
  const total = Math.min(Math.max(h.antecedencia, 1), 30);
  const ultimo = gerarHorarios(h).at(-1) ?? '00:00';
  return Array.from({ length: total + 1 }, (_, i) => {
    const d = new Date(agora); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i);
    const encerrouHoje = i === 0 && horaAgora(agora) >= ultimo;
    const dia = iso(d);
    return { d, iso: dia, fechado: encerrouHoje || h.diasFechados.includes(d.getDay()) || diaInteiroBloqueado(bloqueios, dia, h) };
  }).filter((x, i) => !(i === 0 && x.fechado));
}

export const paraMinutos = (h: string) => { const [a, b] = String(h).split(':').map(Number); return (a || 0) * 60 + (b || 0); };
export const deMinutos = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
/** Bloqueios que valem numa data (os do dia e os semanais do mesmo dia da semana). */
export function bloqueiosDoDia(bloqueios: Block[], data: string) {
  const dia = paraData(data).getDay();
  return bloqueios.filter(b => b.tipo === 'semanal' ? Number(b.diaSemana) === dia : b.data === data);
}
/** O bloqueio cobre todo o horário de funcionamento? */
export function diaInteiroBloqueado(bloqueios: Block[], data: string, h: Pick<Hours, 'abre' | 'fecha'>) {
  return bloqueiosDoDia(bloqueios, data).some(b => paraMinutos(b.inicio) <= paraMinutos(h.abre) && paraMinutos(b.fim) >= paraMinutos(h.fecha));
}
export const bloqueioDiaInteiro = (b: Pick<Block, 'inicio' | 'fim'>) => b.inicio === DIA_INTEIRO.inicio && b.fim === DIA_INTEIRO.fim;

/**
 * Horários livres de um dia para um serviço com duração: o atendimento inteiro precisa caber
 * antes de fechar, fora dos bloqueios, e sem passar do número de vagas em nenhum momento.
 */
export function calcularHorarios({ data, horarios, agendamentos, bloqueios, vagas, duracao, agora = new Date() }: {
  data: string; horarios: Pick<Hours, 'abre' | 'fecha' | 'intervalo'>; agendamentos: Booking[]; bloqueios: Block[]; vagas: number; duracao: number; agora?: Date;
}): Slot[] {
  const fecha = paraMinutos(horarios.fecha);
  const travas = bloqueiosDoDia(bloqueios, data);
  const ativos = agendamentos.filter(a => a.data === data && a.status !== 'Cancelado');
  const agoraTexto = `${iso(agora)} ${horaAgora(agora)}`;
  return gerarHorarios(horarios).map(hora => {
    const ini = paraMinutos(hora); const fim = ini + Math.max(5, duracao || 60);
    const passou = `${data} ${hora}` <= agoraTexto;
    const bloqueado = travas.some(b => paraMinutos(b.inicio) < fim && paraMinutos(b.fim) > ini);
    // Pico de atendimentos simultâneos dentro do intervalo do novo serviço.
    let pico = 0;
    for (let t = ini; t < fim; t += 5) pico = Math.max(pico, ativos.filter(a => paraMinutos(a.hora) <= t && paraMinutos(a.hora) + (a.duracao || 60) > t).length);
    return { hora, livre: !passou && fim <= fecha && !bloqueado && pico < vagas };
  });
}

/** Colunas lado a lado para atendimentos que se sobrepõem no calendário (como no Google Agenda). */
export function colunasSobrepostas<T extends { inicio: number; fim: number }>(itens: T[]) {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
  const saida: { item: T; coluna: number; total: number }[] = [];
  let grupo: { item: T; coluna: number; total: number }[] = []; let fimGrupo = -1;
  const fechar = () => { const total = Math.max(...grupo.map(g => g.coluna)) + 1; grupo.forEach(g => { g.total = total; saida.push(g); }); grupo = []; };
  for (const item of ordenados) {
    if (grupo.length && item.inicio >= fimGrupo) fechar();
    const ocupadas = new Set(grupo.filter(g => g.item.fim > item.inicio).map(g => g.coluna));
    let coluna = 0; while (ocupadas.has(coluna)) coluna++;
    grupo.push({ item, coluna, total: 1 }); fimGrupo = Math.max(fimGrupo, item.fim);
  }
  if (grupo.length) fechar();
  return saida;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "quinta, 20 de nov" */
export function dataLonga(isoStr: string) { const d = paraData(isoStr); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; }
export const diaSemanaCurto = (d: Date) => DIAS[d.getDay()].slice(0, 3);
export const nomeDiaSemana = (n: number) => DIAS[n] ?? '';
export const DIAS_DA_SEMANA = DIAS;
/** Soma dias a uma data no formato da planilha. */
export function somarDias(data: string, n: number) { const d = paraData(data); d.setDate(d.getDate() + n); return iso(d); }
/** Segunda-feira da semana da data. */
export function inicioDaSemana(data: string) { const d = paraData(data); const dia = d.getDay(); return somarDias(data, dia === 0 ? -6 : 1 - dia); }
/** "Toda sábado · a partir das 14:00", "quinta, 26 de nov · 12:00 às 13:00", "… · dia inteiro". */
export function descreverBloqueio(b: Block) {
  const dia = DIAS[Number(b.diaSemana)] ?? '';
  const quando = b.tipo === 'semanal' ? `${dia === 'sábado' || dia === 'domingo' ? 'Todo' : 'Toda'} ${dia}` : dataLonga(String(b.data));
  const periodo = bloqueioDiaInteiro(b) ? 'dia inteiro' : b.fim === '24:00' ? `a partir das ${b.inicio}` : b.inicio === '00:00' ? `até as ${b.fim}` : `${b.inicio} às ${b.fim}`;
  return `${quando} · ${periodo}`;
}
export const mesCurto = (d: Date) => MESES[d.getMonth()];
export const diasFechadosTexto = (dias: number[]) => dias.length ? `Fechado: ${dias.sort().map(d => DIAS[d]).join(', ')}` : 'Aberto todos os dias';

export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');
export function mascaraTelefone(v: string) {
  const n = soDigitos(v).slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
export const telefoneValido = (v: string) => { const n = soDigitos(v).length; return n === 10 || n === 11; };
export const numeroValido = (phone: string) => /^[1-9]\d{9,14}$/.test(phone);
export function linkWhatsApp(numero: string, texto: string) { return `https://wa.me/${soDigitos(numero)}?text=${encodeURIComponent(texto)}`; }
export const normalizar = (v: unknown) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const duracaoTexto = (min: number) => min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;

/** Mensagem que a cliente manda para a loja depois de agendar. */
export function mensagemAgendamento(loja: string, b: Pick<Booking, 'servico' | 'data' | 'hora' | 'id'>, detalhe = '') {
  return `Olá, ${loja}! Acabei de agendar ${b.servico}${detalhe ? ` (${detalhe})` : ''} em ${dataLonga(b.data)} às ${b.hora}. (código ${b.id})`;
}
