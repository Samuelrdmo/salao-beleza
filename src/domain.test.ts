import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarHorarios, diasDisponiveis, dataLonga, mascaraTelefone, telefoneValido, duracaoTexto, mensagemAgendamento, iso, agruparPorCategoria, nomeCategoria, idDoServico, SEM_CATEGORIA } from './domain.ts';
import type { Service, Booking, Block } from './domain.ts';
import { calcularHorarios, diaInteiroBloqueado, colunasSobrepostas, statusNormal } from './domain.ts';

const horas = { abre: '08:00', fecha: '12:00', intervalo: 60 };
const livres = (slots: { hora: string; livre: boolean }[]) => slots.filter(s => s.livre).map(s => s.hora);
const ag = (hora: string, duracao: number, status: Booking['status'] = 'Agendado') => ({ id: hora, data: '2026-12-02', hora, duracao, servico: 'x', cliente: 'y', status }) as Booking;
const ontem = new Date(2026, 11, 1, 9, 0);

test('o serviço inteiro precisa caber: duração, vagas e fechamento', () => {
  // 1 vaga, banho e tosa de 2 h às 08:00 ocupa 08:00 e 09:00.
  assert.deepEqual(livres(calcularHorarios({ data: '2026-12-02', horarios: horas, agendamentos: [ag('08:00', 120)], bloqueios: [], vagas: 1, duracao: 60, agora: ontem })), ['10:00', '11:00']);
  // Serviço de 2 h não começa às 11:00 porque passaria do fechamento.
  assert.deepEqual(livres(calcularHorarios({ data: '2026-12-02', horarios: horas, agendamentos: [], bloqueios: [], vagas: 1, duracao: 120, agora: ontem })), ['08:00', '09:00', '10:00']);
  // Desmarcado libera a vaga; com 2 vagas cabe mais um no mesmo horário.
  assert.deepEqual(livres(calcularHorarios({ data: '2026-12-02', horarios: horas, agendamentos: [ag('08:00', 120, 'Cancelado')], bloqueios: [], vagas: 1, duracao: 60, agora: ontem })), ['08:00', '09:00', '10:00', '11:00']);
  assert.equal(livres(calcularHorarios({ data: '2026-12-02', horarios: horas, agendamentos: [ag('08:00', 60)], bloqueios: [], vagas: 2, duracao: 60, agora: ontem })).includes('08:00'), true);
});
test('bloqueios travam horários, períodos e dias inteiros, também toda semana', () => {
  const sabado = '2026-12-05';
  const depoisDas10: Block = { id: 'b1', tipo: 'semanal', diaSemana: 6, inicio: '10:00', fim: '24:00' };
  assert.deepEqual(livres(calcularHorarios({ data: sabado, horarios: horas, agendamentos: [], bloqueios: [depoisDas10], vagas: 1, duracao: 60, agora: ontem })), ['08:00', '09:00']);
  // Um serviço de 2 h às 09:00 entraria no bloqueio.
  assert.deepEqual(livres(calcularHorarios({ data: sabado, horarios: horas, agendamentos: [], bloqueios: [depoisDas10], vagas: 1, duracao: 120, agora: ontem })), ['08:00']);
  const feriado: Block = { id: 'b2', tipo: 'dia', data: '2026-12-02', inicio: '00:00', fim: '24:00' };
  assert.equal(diaInteiroBloqueado([feriado], '2026-12-02', horas), true);
  assert.equal(diaInteiroBloqueado([depoisDas10], sabado, horas), false);
  assert.deepEqual(livres(calcularHorarios({ data: '2026-12-02', horarios: horas, agendamentos: [], bloqueios: [feriado], vagas: 3, duracao: 30, agora: ontem })), []);
});
test('calendário põe lado a lado só o que se sobrepõe; status antigos viram Agendado', () => {
  const r = colunasSobrepostas([{ id: 'a', inicio: 480, fim: 600 }, { id: 'b', inicio: 540, fim: 600 }, { id: 'c', inicio: 660, fim: 720 }]);
  const por = Object.fromEntries(r.map(x => [x.item.id, [x.coluna, x.total]]));
  assert.deepEqual(por, { a: [0, 2], b: [1, 2], c: [0, 1] });
  assert.equal(statusNormal('Confirmado'), 'Agendado');
  assert.equal(statusNormal('Pendente'), 'Agendado');
  assert.equal(statusNormal('Cancelado'), 'Cancelado');
});

test('serviços saem agrupados na ordem das categorias, com os soltos no fim', () => {
  const s = (id: string, categoria?: string) => ({ id, nome: id, descricao: '', duracao: 60, preco: '', icone: '', categoria }) as Service;
  const grupos = agruparPorCategoria([s('a', 'Gatos'), s('b', 'Banho e tosa'), s('c'), s('d', 'Apagada')], ['Banho e tosa', 'Gatos', 'Vazia']);
  assert.deepEqual(grupos.map(g => [g.categoria, g.servicos.map(x => x.id)]), [['Banho e tosa', ['b']], ['Gatos', ['a']], [SEM_CATEGORIA, ['c', 'd']]]);
  assert.equal(nomeCategoria('  Banho   e tosa '), 'Banho e tosa');
  assert.equal(nomeCategoria('x'), null);
  assert.match(idDoServico('Banho & Tosa Grande'), /^banho-tosa-grande-[a-z0-9]{1,4}$/);
});

test('horários vão da abertura até o último que termina no fechamento', () => {
  assert.deepEqual(gerarHorarios({ abre: '08:00', fecha: '10:00', intervalo: 30 }), ['08:00', '08:30', '09:00', '09:30']);
  assert.deepEqual(gerarHorarios({ abre: '09:00', fecha: '10:30', intervalo: 60 }), ['09:00']);
  assert.deepEqual(gerarHorarios({ abre: '18:00', fecha: '18:00', intervalo: 60 }), []);
});
test('dias fechados ficam bloqueados e hoje some quando a agenda do dia acabou', () => {
  const horas = { abre: '09:00', fecha: '18:00', intervalo: 60, diasFechados: [0], antecedencia: 7 };
  const segundaCedo = new Date(2026, 10, 23, 8, 0); // segunda
  const dias = diasDisponiveis(horas, segundaCedo);
  assert.equal(dias[0].iso, '2026-11-23');
  assert.equal(dias.find(d => d.iso === '2026-11-29')?.fechado, true); // domingo
  const segundaNoite = new Date(2026, 10, 23, 20, 0);
  assert.equal(diasDisponiveis(horas, segundaNoite)[0].iso, '2026-11-24');
});
test('datas, telefone e duração em português', () => {
  assert.equal(dataLonga('2026-11-26'), 'quinta, 26 de nov');
  assert.equal(iso(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(mascaraTelefone('34999998888'), '(34) 99999-8888');
  assert.equal(mascaraTelefone('3433334444'), '(34) 3333-4444');
  assert.equal(telefoneValido('(34) 99999-8888'), true);
  assert.equal(telefoneValido('9999-8888'), false);
  assert.equal(duracaoTexto(45), '45 min');
  assert.equal(duracaoTexto(90), '1 h 30 min');
  assert.equal(duracaoTexto(120), '2 h');
});
test('mensagem para o WhatsApp tem serviço, detalhe, dia, hora e código', () => {
  const msg = mensagemAgendamento('Íris', { servico: 'Corte', data: '2026-11-26', hora: '10:00', id: 'A1B2' }, 'com Bia');
  assert.equal(msg, 'Olá, Íris! Acabei de agendar Corte (com Bia) em quinta, 26 de nov às 10:00. (código A1B2)');
});
