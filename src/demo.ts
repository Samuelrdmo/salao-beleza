import { iso } from './domain';
import type { Block, Booking, Field, Hours, Service } from './domain';

/* Salão fictício da apresentação (e de qualquer cliente sem planilha conectada).
   Fotos do Unsplash em clients/demo/public/images. */

export const demoCategories = ['Cabelo', 'Unhas', 'Estética'];

export const demoServices: Service[] = [
  { id: 'corte', nome: 'Corte feminino', descricao: 'Lavagem, corte e finalização simples. Traga uma foto de referência.', duracao: 60, preco: 'a partir de R$ 70', icone: 'tesoura', foto: '/images/s-corte.jpg', categoria: 'Cabelo', ativo: true },
  { id: 'corte-escova', nome: 'Corte e escova', descricao: 'Corte com escova modelada para sair pronta.', duracao: 90, preco: 'a partir de R$ 110', icone: 'secador', foto: '/images/s-escova.jpg', categoria: 'Cabelo', ativo: true },
  { id: 'coloracao', nome: 'Coloração', descricao: 'Cor de raiz ou global, com tonalização e finalização.', duracao: 120, preco: 'a partir de R$ 160', icone: 'pincel', foto: '/images/s-cor.jpg', categoria: 'Cabelo', ativo: true },
  { id: 'mechas', nome: 'Mechas e luzes', descricao: 'Mechas, luzes ou morena iluminada. O valor depende do comprimento.', duracao: 180, preco: 'sob avaliação', icone: 'spa', foto: '/images/s-mechas.jpg', categoria: 'Cabelo', ativo: true },
  { id: 'hidratacao', nome: 'Hidratação', descricao: 'Tratamento com máscara e escova para fios macios e com brilho.', duracao: 60, preco: 'R$ 90', icone: 'gota', foto: '/images/s-hidratacao.jpg', categoria: 'Cabelo', ativo: true },
  { id: 'manicure', nome: 'Manicure', descricao: 'Cutilagem, lixamento e esmaltação.', duracao: 45, preco: 'R$ 35', icone: 'unhas', foto: '/images/s-manicure.jpg', categoria: 'Unhas', ativo: true },
  { id: 'pe-mao', nome: 'Pé e mão', descricao: 'Manicure e pedicure no mesmo horário.', duracao: 90, preco: 'R$ 65', icone: 'flor', foto: '/images/s-pedicure.jpg', categoria: 'Unhas', ativo: true },
  { id: 'sobrancelha', nome: 'Design de sobrancelha', descricao: 'Desenho com pinça e linha, respeitando o seu rosto.', duracao: 30, preco: 'R$ 45', icone: 'olhar', foto: '/images/s-sobrancelha.jpg', categoria: 'Estética', ativo: true },
];

export const demoFields: Field[] = [
  { id: 'profissional', rotulo: 'Profissional', tipo: 'opcoes', opcoes: ['Sem preferência', 'Bia', 'Carol', 'Lu'], obrigatorio: true },
];

/** Fecha domingo e segunda, como a maioria dos salões. */
export const demoHours: Hours = { abre: '09:00', fecha: '19:00', intervalo: 30, diasFechados: [0, 1], antecedencia: 30 };
/** Três profissionais: até três clientes ao mesmo tempo. */
export const demoSlotsPerHour = 3;
export const demoLogin = { usuario: 'demo', senha: 'demo1234', nome: 'Equipe Íris' };

/** Agendamentos de exemplo, em dias relativos a hoje (duração em minutos). */
const com = (prof: string) => [{ rotulo: 'Profissional', valor: prof }];
const exemplos: (Omit<Booking, 'id' | 'data'> & { dias: number })[] = [
  { dias: 0, hora: '09:00', duracao: 90, servico: 'Corte e escova', cliente: 'Patrícia Alves', telefone: '34991112222', status: 'Agendado', extras: com('Bia') },
  { dias: 0, hora: '09:30', duracao: 180, servico: 'Mechas e luzes', cliente: 'Carla Menezes', telefone: '34992223333', status: 'Agendado', obs: 'Quero um loiro mais natural.', extras: com('Lu') },
  { dias: 0, hora: '11:00', duracao: 45, servico: 'Manicure', cliente: 'Juliana Prado', telefone: '34987654321', status: 'Agendado', extras: com('Carol') },
  { dias: 0, hora: '15:00', duracao: 60, servico: 'Hidratação', cliente: 'Larissa Martins', telefone: '34993334444', status: 'Cancelado', extras: com('Bia') },
  { dias: 0, hora: '16:00', duracao: 30, servico: 'Design de sobrancelha', cliente: 'Renata Lopes', telefone: '34997778888', status: 'Agendado', extras: com('Sem preferência') },
  { dias: 1, hora: '10:00', duracao: 120, servico: 'Coloração', cliente: 'Fernanda Lima', telefone: '34955554444', status: 'Agendado', extras: com('Lu') },
  { dias: 1, hora: '10:00', duracao: 90, servico: 'Pé e mão', cliente: 'Beatriz Rocha', telefone: '34994445555', status: 'Agendado', extras: com('Carol') },
  { dias: 1, hora: '14:00', duracao: 60, servico: 'Corte feminino', cliente: 'Ana Beatriz', telefone: '34944443333', status: 'Agendado', obs: 'Só as pontas.', extras: com('Bia') },
  { dias: 2, hora: '09:00', duracao: 90, servico: 'Corte e escova', cliente: 'Gabriela Pires', telefone: '34995556666', status: 'Agendado', extras: com('Bia') },
  { dias: 2, hora: '14:00', duracao: 45, servico: 'Manicure', cliente: 'Camila Duarte', telefone: '34996667777', status: 'Agendado', extras: com('Carol') },
  { dias: 3, hora: '11:00', duracao: 180, servico: 'Mechas e luzes', cliente: 'Marina Souza', telefone: '34933332222', status: 'Agendado', extras: com('Lu') },
  { dias: 3, hora: '16:30', duracao: 60, servico: 'Hidratação', cliente: 'Sofia Rezende', telefone: '34912345678', status: 'Agendado', extras: com('Bia') },
];

/** Bloqueios de exemplo: sábado só até as 15h (toda semana) e o almoço da equipe daqui a dois dias. */
export function demoBlocks(hoje = new Date()): Block[] {
  const d = new Date(hoje); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 2);
  while (demoHours.diasFechados.includes(d.getDay())) d.setDate(d.getDate() + 1);
  const data = iso(d);
  return [
    { id: 'BLQ-SAB', tipo: 'semanal', diaSemana: 6, inicio: '15:00', fim: '24:00', motivo: 'Sábado só até as 15h' },
    { id: 'BLQ-ALMOCO', tipo: 'dia', data, inicio: '12:00', fim: '13:00', motivo: 'Almoço da equipe' },
  ];
}

export function demoBookings(hoje = new Date()): Booking[] {
  const proximoAberto = (n: number) => {
    const d = new Date(hoje); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n);
    while (demoHours.diasFechados.includes(d.getDay())) d.setDate(d.getDate() + 1);
    return d;
  };
  return exemplos.map(({ dias, ...e }, i) => ({ ...e, id: `DEMO${String(i + 1).padStart(4, '0')}`, data: iso(proximoAberto(dias)) }));
}
