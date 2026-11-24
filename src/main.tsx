import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { FormEvent, ReactNode } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, X, LoaderCircle, Check, ChevronLeft, ChevronRight, Lock, Unlock, MessageCircle, CheckCircle2, AlertCircle, CalendarDays, Clock, MapPin, Flower2, Scissors, Wind, Paintbrush, Droplets, Hand, Eye as EyeIcon, Sparkles, Heart, LogOut, RefreshCw, Search, LockKeyhole, RotateCcw, Eye, EyeOff, Ticket, Plus, Trash2, Pencil, ImagePlus } from 'lucide-react';
import { client, brand, texts, demoMode, presentation, STORE } from './config';
import { rich } from './rich';
import { adminServices, createCategory, deleteBlock, deleteCategory, deleteService, saveBlock, saveService, availability, book, currentSession, demoCredentials, findBookings, forgetBooking, listBlocks, listBookings, loadConfig, login, logout, rememberBooking, rememberedBooking, resetDemo, setStatus } from './api';
import type { Catalog, Session } from './api';
import { optimizeImage } from './images';
import { DIAS_DA_SEMANA, DIA_INTEIRO, diaInteiroBloqueado, DURACOES, SERVICE_ICONS, agruparPorCategoria, bloqueiosDoDia, colunasSobrepostas, deMinutos, descreverBloqueio, inicioDaSemana, nomeCategoria, paraData, paraMinutos, sameText, somarDias, dataLonga, diaSemanaCurto, diasDisponiveis, diasFechadosTexto, duracaoTexto, iso, linkWhatsApp, mascaraTelefone, mensagemAgendamento, mesCurto, numeroValido, soDigitos, telefoneValido } from './domain';
import type { Block, Booking, Service, SiteConfig, Slot, Status } from './domain';
import '@client/tokens.css';
import './index.css';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// A apresentação (GSAP e React Bits) só é baixada quando o cliente é a demo de venda.
const Pitch = lazy(() => import('./pitch').then(m => ({ default: m.Pitch })));
const DemoBar = lazy(() => import('./pitch').then(m => ({ default: m.DemoBar })));
const THEME_KEY = 'agenda-apresentacao-paleta';
if (presentation) { try { document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'rose'; } catch { /* paleta padrão */ } }

function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => { const changed = () => { setRoute(window.location.hash.slice(1) || '/'); window.scrollTo({ top: 0 }); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  return route;
}
/** Configuração do site (serviços, campos, horários e contatos) vinda da planilha ou da demonstração. */
function useSite() {
  const [site, setSite] = useState<SiteConfig | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => { let live = true; setError(''); loadConfig().then(c => { if (live) setSite(c); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [retry]);
  return { site, error, retry: () => setRetry(n => n + 1) };
}

// ---------- Peças de interface ----------
const ICONS: Record<string, typeof Scissors> = { tesoura: Scissors, corte: Scissors, secador: Wind, escova: Wind, pincel: Paintbrush, cor: Paintbrush, gota: Droplets, hidratacao: Droplets, unhas: Hand, maos: Hand, olhar: EyeIcon, sobrancelha: EyeIcon, spa: Sparkles, flor: Flower2, coracao: Heart };
function ServiceIcon({ icone, size = 20 }: { icone: string; size?: number }) {
  const Icon = ICONS[icone?.toLowerCase()];
  return Icon ? <Icon size={size} strokeWidth={1.8} /> : <span className="emoji" aria-hidden="true">{icone || '✨'}</span>;
}
function Brand({ compact = false }: { compact?: boolean }) {
  return <a className={`brand ${compact ? 'brand-compact' : ''}`} href={`#${STORE}`} aria-label={`${brand.fullName} — início`}>{brand.logo ? <img src={brand.logo} alt={brand.logoAlt} width={brand.logoWidth || undefined} height={brand.logoHeight || undefined} /> : <><span className="brand-mark" aria-hidden="true"><Flower2 size={22} strokeWidth={2.2} /></span><span className="brand-type"><span className="brand-name">{brand.name}</span><span className="brand-signature">{brand.signature}</span></span></>}</a>;
}
function Loading({ text = 'Carregando…' }: { text?: string }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={22} /><span>{text}</span></div>; }
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) { return <div className="error-box" role="alert"><AlertCircle size={20} /><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Tentar de novo</button>}</div>; }
function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) { return <div className="empty"><Flower2 size={34} strokeWidth={1.5} /><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>; }

function Header({ admin }: { admin: boolean }) {
  return <>
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); const main = document.getElementById('main'); if (main) { main.tabIndex = -1; main.focus(); main.scrollIntoView(); } }}>Ir para o conteúdo</a>
    <div className="topline">{presentation ? <><span className="demo-dot" /> Salão fictício de apresentação <span className="topline-divider">·</span> Agende à vontade</> : demoMode ? <><span className="demo-dot" /> Modo demonstrativo <span className="topline-divider">·</span> Agendamentos ficam neste navegador</> : texts.topline}</div>
    <header className="header"><div className="header-inner">
      <nav className="desktop-nav" aria-label="Principal">{admin ? <a href="#/admin" className="nav-active">Agenda</a> : <><a href={`#${STORE}`} onClick={e => { if ((window.location.hash.slice(1) || '/') === STORE) { e.preventDefault(); document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' }); } }}>Serviços</a><a href="#/meu-agendamento">Meu agendamento</a></>}</nav>
      <Brand />
      <div className="header-actions">{admin
        ? <a className="shopkeeper" href={`#${STORE}`}><Eye size={17} /><span>Ver site</span></a>
        : <><a className="shopkeeper header-mine" href="#/meu-agendamento" aria-label="Meu agendamento"><Ticket size={18} /></a><a className="button header-book" href="#/agendar"><CalendarDays size={16} />Agendar</a></>}</div>
    </div></header>
  </>;
}
function Footer({ site }: { site: SiteConfig | null }) {
  const c = site?.contato;
  return <footer className="footer"><div className="footer-main wrap">
    <div><Brand compact /><p>{texts.footerTagline}</p></div>
    <div className="footer-links">
      <a href="#/agendar">Agendar horário <ArrowUpRight size={15} /></a>
      {c?.whatsapp && numeroValido(soDigitos(c.whatsapp)) && <a href={linkWhatsApp(c.whatsapp, `Olá, ${brand.fullName}!`)} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={15} /></a>}
      {c?.instagram && <a href={c.instagram.startsWith('http') ? c.instagram : `https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={15} /></a>}
      <a href="#/admin">Área da equipe <ArrowUpRight size={15} /></a>
    </div>
    <div className="footer-note"><Flower2 size={24} strokeWidth={1.5} /><p>{rich(texts.footerNote)}</p></div>
  </div><div className="footer-bottom wrap"><span>© {new Date().getFullYear()} {brand.fullName}. Todos os direitos reservados.</span><span>{brand.signature}</span><a className="octype-credit" href="https://octype.studio/" target="_blank" rel="noopener noreferrer" aria-label="Design por Octype, abre octype.studio"><span>Design por</span><img src="/octype/simbolo.svg" alt="" width="30" height="18" /><img src="/octype/wordmark.svg" alt="Octype" width="56" height="11" /></a></div></footer>;
}

// ---------- Início ----------
const HOW = [
  { icon: CalendarDays, title: 'Escolha o serviço', text: 'Corte, escova, cor, unhas e sobrancelha.' },
  { icon: Clock, title: 'Marque o horário', text: 'Só aparecem os horários livres.' },
  { icon: MessageCircle, title: 'Pronto!', text: 'Seu horário já fica reservado.' },
];
function Home({ site, error, retry }: ReturnType<typeof useSite>) {
  return <>
    <section className="hero wrap">
      <div className="hero-copy">
        <span className="eyebrow"><span className="gold-line" /> {texts.heroEyebrow}</span>
        <h1>{rich(texts.heroTitle)}</h1>
        <p>{rich(texts.heroText)}</p>
        <div className="hero-actions"><a className="button hero-cta" href="#/agendar"><CalendarDays size={18} />{texts.heroCta}</a><a className="button button-outline" href="#/meu-agendamento">Meu agendamento</a></div>
        <span className="hero-bottom"><Flower2 size={14} /> {texts.heroBottom}</span>
      </div>
      <div className="hero-visual">
        <img src={client.images.hero} alt={`Cliente atendida no ${brand.fullName}`} />
        <div className="hero-photo-caption"><span>{texts.heroCaptionTitle}</span><span>{texts.heroCaptionText}</span></div>
        <span className="hero-stamp"><Flower2 size={24} strokeWidth={1.6} /><span>{rich(texts.heroStamp)}</span></span>
      </div>
    </section>

    <main className="wrap services-section" id="main">
      <div id="servicos" className="section-heading"><div><span className="eyebrow">{texts.servicesEyebrow}</span><h2>{rich(texts.servicesTitle)}</h2></div></div>
      {error ? <ErrorBox message={error} retry={retry} /> : !site ? <Loading text="Carregando os serviços…" /> : agruparPorCategoria(site.servicos, site.categorias ?? []).map((g, i, all) => <section key={g.categoria} className="service-category">{all.length > 1 && <h3 className="category-title">{g.categoria}</h3>}<div className="services-grid">{g.servicos.map(s => <ServiceCard key={s.id} service={s} />)}</div></section>)}
    </main>

    <section className="wrap how-band">{HOW.map(({ icon: Icon, title, text }, i) => <div key={title}><span className="how-number">{i + 1}</span><Icon size={22} strokeWidth={1.7} /><h3>{title}</h3><p>{text}</p></div>)}</section>

    {site && <section className="wrap info-band">
      <div><Clock size={20} /><div><strong>Horário</strong><span>{site.horarios.abre} às {site.horarios.fecha}</span><small>{diasFechadosTexto([...site.horarios.diasFechados])}</small></div></div>
      {site.contato.endereco && <div><MapPin size={20} /><div><strong>Endereço</strong><span>{site.contato.endereco}</span></div></div>}
      <div><CalendarDays size={20} /><div><strong>Agenda online</strong><span>Até {site.horarios.antecedencia} dias à frente</span></div></div>
      <a className="button" href="#/agendar">Agendar agora <ArrowRight size={17} /></a>
    </section>}
  </>;
}
function ServiceCard({ service: s }: { service: Service }) {
  return <article className="service-card">
    {s.foto && <div className="service-photo"><img src={s.foto} alt="" loading="lazy" /></div>}
    <div className="service-body">
      <span className="service-icon"><ServiceIcon icone={s.icone} /></span>
      <h3>{s.nome}</h3>
      <p>{s.descricao}</p>
      <div className="service-meta"><span><Clock size={14} />{duracaoTexto(s.duracao)}</span>{s.preco && <strong>{s.preco}</strong>}</div>
      <a className="button button-outline full" href={`#/agendar/${encodeURIComponent(s.id)}`}>Agendar <ArrowRight size={16} /></a>
    </div>
  </article>;
}

// ---------- Agendar ----------
function Booker({ site, preselected }: { site: SiteConfig; preselected: string }) {
  const [step, setStep] = useState(preselected && site.servicos.some(s => s.id === preselected) ? 2 : 1);
  const [serviceId, setServiceId] = useState(preselected);
  const days = useMemo(() => diasDisponiveis(site.horarios, new Date(), site.bloqueios ?? []), [site]);
  const [date, setDate] = useState(() => days.find(d => !d.fechado)?.iso || '');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', obs: '' });
  const [fields, setFields] = useState<Record<string, string>>(() => Object.fromEntries(site.campos.map(c => [c.id, c.tipo === 'opcoes' ? c.opcoes[0] ?? '' : ''])));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState<(Booking & { detalhe?: string }) | null>(null);
  const service = site.servicos.find(s => s.id === serviceId);

  useEffect(() => {
    if (step !== 2 || !date) return;
    let live = true; setSlots(null); setTime('');
    availability(date, serviceId).then(r => { if (live) setSlots(r.horarios); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [date, step, serviceId]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!telefoneValido(form.telefone)) { setError('Informe o WhatsApp com DDD.'); return; }
    setBusy(true);
    try {
      const r = await book({ ...form, campos: fields, servico: serviceId, data: date, hora: time });
      const prof = fields.profissional && !/sem prefer/i.test(fields.profissional) ? fields.profissional : '';
      const saved = { ...r.agendamento, detalhe: prof ? `com ${prof}` : '' };
      rememberBooking(saved); setDone(saved); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
      if (/preenchido|passou/.test((err as Error).message)) setStep(2);
    } finally { setBusy(false); }
  }

  if (done) {
    const whatsapp = soDigitos(site.contato.whatsapp);
    return <div className="booking-done">
      <span className="done-check"><Check size={30} strokeWidth={2.5} /></span>
      <span className="eyebrow">TUDO CERTO</span>
      <h1>Agendamento <em>feito!</em></h1>
      <TicketCard booking={done} />
      <p className="helper">Guardamos este agendamento neste aparelho. Se precisar, é só abrir <b>Meu agendamento</b> e informar seu WhatsApp e seu nome.</p>
      <div className="done-actions">
        {numeroValido(whatsapp) && <a className="button" href={linkWhatsApp(whatsapp, mensagemAgendamento(brand.fullName, done, done.detalhe))} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />Avisar no WhatsApp</a>}
        <a className="button button-outline" href={`#${STORE}`}>Voltar ao início</a>
      </div>
      {presentation && <p className="helper">No seu salão, o botão de WhatsApp abre a conversa com a mensagem pronta. E o agendamento já aparece na agenda da equipe.</p>}
    </div>;
  }

  return <div className="booking">
    <a className="back-link" href={`#${STORE}`}><ArrowLeft size={16} />Voltar</a>
    <span className="eyebrow">AGENDAMENTO ONLINE</span>
    <h1>Marque o seu <em>horário.</em></h1>
    <ol className="stepper" aria-label={`Etapa ${step} de 3`}>{['Serviço', 'Dia e hora', 'Seus dados'].map((label, i) => <li key={label} className={step > i + 1 ? 'done' : step === i + 1 ? 'current' : ''}><span>{step > i + 1 ? <Check size={14} strokeWidth={3} /> : i + 1}</span>{label}</li>)}</ol>
    {error && <ErrorBox message={error} />}

    {step === 1 && <section>
      <h2 className="step-title">Qual serviço?</h2>
      {agruparPorCategoria(site.servicos, site.categorias ?? []).map((g, gi, all) => <div key={g.categoria} className="choice-group">{all.length > 1 && <h3 className="choice-group-title">{g.categoria}</h3>}<div className="choice-list">{g.servicos.map(s => <button type="button" key={s.id} className={`choice ${serviceId === s.id ? 'selected' : ''}`} aria-pressed={serviceId === s.id} onClick={() => { setServiceId(s.id); setError(''); setStep(2); }}>
        <span className="service-icon"><ServiceIcon icone={s.icone} /></span>
        <span className="choice-text"><strong>{s.nome}</strong><small>{s.descricao}</small><small className="choice-meta"><Clock size={12} />{duracaoTexto(s.duracao)}{s.preco && <> · <b>{s.preco}</b></>}</small></span>
        <ArrowRight size={18} className="choice-arrow" />
      </button>)}</div></div>)}
    </section>}

    {step === 2 && <section>
      <button type="button" className="summary-chip" onClick={() => setStep(1)}>{service && <ServiceIcon icone={service.icone} size={16} />}{service?.nome}<span>Trocar</span></button>
      <h2 className="step-title">Que dia?</h2>
      <div className="day-strip" aria-label="Dias">{days.map(({ d, iso: day, fechado }) => <button type="button" key={day} className={`day ${date === day ? 'selected' : ''}`} disabled={fechado} aria-pressed={date === day} aria-label={dataLonga(day)} onClick={() => setDate(day)}><small>{day === iso(new Date()) ? 'hoje' : diaSemanaCurto(d)}</small><b>{d.getDate()}</b><small>{mesCurto(d)}</small></button>)}</div>
      <h2 className="step-title">Que horas?</h2>
      {!slots ? <Loading text="Vendo horários livres…" /> : slots.some(s => s.livre)
        ? <div className="slot-grid">{slots.map(s => <button type="button" key={s.hora} className={`slot ${time === s.hora ? 'selected' : ''}`} disabled={!s.livre} aria-pressed={time === s.hora} onClick={() => setTime(s.hora)}>{s.hora}</button>)}</div>
        : <div className="notice">Sem horários livres nesse dia. Escolha outro.</div>}
      <div className="step-actions"><button type="button" className="button button-outline" onClick={() => setStep(1)}><ArrowLeft size={16} />Voltar</button><button type="button" className="button" disabled={!time} onClick={() => { setError(''); setStep(3); }}>Continuar <ArrowRight size={16} /></button></div>
    </section>}

    {step === 3 && <form className="form" onSubmit={submit}>
      <button type="button" className="summary-chip" onClick={() => setStep(2)}><CalendarDays size={16} />{service?.nome} · {dataLonga(date)} às {time}<span>Trocar</span></button>
      <h2 className="step-title">Seus dados</h2>
      <div className="form-grid">
        <Field id="b-nome" label="Seu nome"><Input id="b-nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoComplete="name" maxLength={80} /></Field>
        <Field id="b-tel" label="WhatsApp" hint="Com ele você encontra o agendamento depois."><Input id="b-tel" required inputMode="tel" placeholder="(34) 99999-9999" value={form.telefone} onChange={e => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })} autoComplete="tel" /></Field>
        {site.campos.map(c => c.tipo === 'opcoes'
          ? <fieldset key={c.id} className="segmented-field"><legend>{c.rotulo}</legend><span className="segmented">{c.opcoes.map(o => <button type="button" key={o} aria-pressed={fields[c.id] === o} className={fields[c.id] === o ? 'selected' : ''} onClick={() => setFields({ ...fields, [c.id]: o })}>{o}</button>)}</span></fieldset>
          : <Field key={c.id} id={`b-${c.id}`} label={c.rotulo} optional={!c.obrigatorio} className={c.tipo === 'longo' ? 'wide' : ''}>
            {c.tipo === 'longo' ? <Textarea id={`b-${c.id}`} rows={3} maxLength={120} required={c.obrigatorio} value={fields[c.id] ?? ''} onChange={e => setFields({ ...fields, [c.id]: e.target.value })} />
              : <Input id={`b-${c.id}`} maxLength={120} required={c.obrigatorio} value={fields[c.id] ?? ''} onChange={e => setFields({ ...fields, [c.id]: e.target.value })} autoComplete="off" />}
          </Field>)}
        <Field id="b-obs" label="Alguma observação?" optional className="wide"><Textarea id="b-obs" rows={3} maxLength={300} value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} placeholder="Referência de corte, alergias, preferências…" /></Field>
      </div>
      <div className="step-actions"><button type="button" className="button button-outline" onClick={() => setStep(2)}><ArrowLeft size={16} />Voltar</button><button className="button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{busy ? 'Agendando…' : 'Confirmar agendamento'}</button></div>
    </form>}
  </div>;
}
function BookPage({ preselected }: { preselected: string }) {
  const { site, error, retry } = useSite();
  return <main className="wrap page" id="main">{error ? <ErrorBox message={error} retry={retry} /> : !site ? <Loading /> : <Booker site={site} preselected={preselected} />}</main>;
}
function TicketCard({ booking: b }: { booking: Booking & { detalhe?: string } }) {
  return <div className="ticket">
    <div className="ticket-top"><span>{b.servico}{b.detalhe ? ` · ${b.detalhe}` : ''}</span><span className={`status status-${b.status}`}>{b.status === 'Cancelado' ? 'Desmarcado' : 'Agendado'}</span></div>
    <div className="ticket-when"><strong>{b.hora}</strong><span>{dataLonga(b.data)}</span></div>
    <div className="ticket-code">Código <b>{b.id}</b></div>
  </div>;
}

// ---------- Meu agendamento ----------
function MinePage() {
  const [saved, setSaved] = useState(rememberedBooking);
  const [telefone, setTelefone] = useState(''); const [nome, setNome] = useState('');
  const [results, setResults] = useState<Booking[] | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function search(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { setResults((await findBookings(telefone, nome)).agendamentos); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <main className="wrap page narrow" id="main">
    <a className="back-link" href={`#${STORE}`}><ArrowLeft size={16} />Voltar</a>
    <span className="eyebrow">MEU AGENDAMENTO</span>
    <h1>Seu horário <em>marcado.</em></h1>
    {saved && <div className="mine-saved"><p className="helper">Último agendamento feito neste aparelho:</p><TicketCard booking={saved} /><button className="text-button" onClick={() => { forgetBooking(); setSaved(null); }}>Esquecer neste aparelho</button></div>}
    <form className="form lookup" onSubmit={search}>
      <h2 className="step-title">{saved ? 'Procurar outro agendamento' : 'Encontre pelo seu WhatsApp'}</h2>
      <div className="form-grid">
        <Field id="m-tel" label="WhatsApp"><Input id="m-tel" required inputMode="tel" placeholder="(34) 99999-9999" value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} autoComplete="tel" /></Field>
        <Field id="m-nome" label="Seu nome"><Input id="m-nome" required value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" /></Field>
      </div>
      {error && <ErrorBox message={error} />}
      <button className="button full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}Buscar</button>
    </form>
    {results && (results.length ? <div className="mine-results">{results.map(b => <TicketCard key={b.id} booking={b} />)}</div> : <Empty title="Nenhum agendamento encontrado" action={<a className="button" href="#/agendar">Agendar agora</a>}>Confira se o WhatsApp e o nome são os mesmos usados no agendamento.</Empty>)}
  </main>;
}

// ---------- Painel da equipe ----------
type Notify = (message: string, warning?: boolean) => void;
function LoginPage({ onLogin }: { onLogin: (s: Session) => void }) {
  const [usuario, setUsuario] = useState(''); const [senha, setSenha] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { onLogin(await login(usuario, senha)); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <main className="login-page wrap" id="main">
    <div className="login-image"><img src={client.images.login} alt="" /><span>{rich(texts.loginImageText)}</span></div>
    <div className="login-content">
      <a className="back-link" href={`#${STORE}`}><ArrowLeft size={16} />Voltar ao site</a>
      <span className="eyebrow">ÁREA DA EQUIPE</span>
      <h1>{rich(texts.loginTitle)}</h1>
      <p className="muted">Entre para ver a agenda e organizar os horários.</p>
      {demoCredentials && <div className="notice">Demonstração: usuário <b>{demoCredentials.usuario}</b> e senha <b>{demoCredentials.senha}</b>.</div>}
      <form onSubmit={submit} className="form login-form">
        <Field id="l-user" label="Usuário"><Input id="l-user" required value={usuario} onChange={e => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} /></Field>
        <Field id="l-pass" label="Senha"><Input id="l-pass" type="password" required value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" /></Field>
        {error && <ErrorBox message={error} />}
        <button className="button full" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={17} />}{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  </main>;
}
// ---------- Agenda da equipe: calendário (semana/dia) e lista ----------
type View = 'semana' | 'dia' | 'lista';
const PX_POR_MIN = 1.1; // 66 px por hora
const VIEWS: [View, string][] = [['semana', 'Semana'], ['dia', 'Dia'], ['lista', 'Lista']];
const narrowQuery = '(max-width: 760px)';
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** true em telas de celular (acompanha a rotação e o redimensionamento). */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(narrowQuery).matches);
  useEffect(() => { const m = window.matchMedia(narrowQuery); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  return narrow;
}
const profDe = (a: Booking) => { const v = a.extras?.find(x => /profissional/i.test(x.rotulo))?.valor; return v && !/sem prefer/i.test(v) ? v : ''; };
const fimDe = (a: Booking) => deMinutos(paraMinutos(a.hora) + (a.duracao || 60));
function rotuloPeriodo(view: View, dias: string[]) {
  if (view === 'dia') return dataLonga(dias[0]);
  const a = paraData(dias[0]); const b = paraData(dias[dias.length - 1]);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} de ${mesCurto(b)}` : `${a.getDate()} de ${mesCurto(a)} – ${b.getDate()} de ${mesCurto(b)}`;
}
function contatoCliente(a: Booking, texto: string) { return a.telefone ? linkWhatsApp(`55${a.telefone}`, texto) : ''; }

function AgendaView({ session, onLogout, notify, revision }: { session: Session; onLogout: () => void; notify: Notify; revision: number }) {
  const narrow = useNarrow();
  const [view, setView] = useState<View>(() => window.matchMedia(narrowQuery).matches ? 'dia' : 'semana');
  const [anchor, setAnchor] = useState(() => iso(new Date()));
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [list, setList] = useState<Booking[] | null>(null); const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState(''); const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null); const [blockOpen, setBlockOpen] = useState<Block | null>(null);
  // No celular a semana em 7 colunas não cabe: vira o dia com a faixa da semana em cima.
  const modo: View = narrow && view === 'semana' ? 'dia' : view;
  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => somarDias(inicioDaSemana(anchor), i)), [anchor]);
  const dias = useMemo(() => modo === 'dia' ? [anchor] : modo === 'semana' ? semana : Array.from({ length: 14 }, (_, i) => somarDias(anchor, i)), [modo, anchor, semana]);
  // No dia, busca a semana inteira: trocar de dia é instantâneo e a faixa mostra quantos atendimentos cada dia tem.
  const de = modo === 'lista' ? dias[0] : semana[0]; const ate = modo === 'lista' ? dias[dias.length - 1] : semana[6];
  const reload = () => setTick(n => n + 1);
  useEffect(() => {
    let live = true; setError(''); setList(null);
    Promise.all([loadConfig(), listBookings(session.token, de, ate), listBlocks(session.token)])
      .then(([c, r, b]) => { if (!live) return; setSite(c); setList(r.agendamentos); setBlocks(b.bloqueios); })
      .catch(err => { if (!live) return; if (/Sessão|login/i.test(err.message)) onLogout(); else setError(err.message); });
    return () => { live = false; };
  }, [de, ate, session.token, onLogout, revision, tick]);
  const passo = modo === 'dia' ? 1 : 7;

  async function change(b: Booking, status: Status) {
    const before = list; setList(l => l?.map(a => a.id === b.id ? { ...a, status } : a) ?? null);
    setSelected(s => s && s.id === b.id ? { ...s, status } : s);
    try { await setStatus(session.token, b.id, status); notify(status === 'Cancelado' ? `${b.cliente}: horário desmarcado.` : `${b.cliente}: horário remarcado.`); }
    catch (err) { setList(before); setError((err as Error).message); }
  }
  async function removeBlock(b: Block) {
    try { await deleteBlock(session.token, b.id); setBlockOpen(null); notify('Bloqueio removido. O horário voltou para o site.'); reload(); } catch (err) { notify((err as Error).message, true); }
  }
  const visiveis = (list ?? []).filter(a => dias.includes(a.data));
  const ativos = visiveis.filter(a => a.status !== 'Cancelado');
  const horas = duracaoTexto(ativos.reduce((t, a) => t + (a.duracao || 60), 0));
  const novoBloqueio = (data: string) => setBlockDraft({ tipo: 'dia', data, inicio: '12:00', fim: '13:00', diaInteiro: false, motivo: '' });

  return <>
    {narrow ? <div className="m-agenda-top">
      <div className="m-agenda-row">
        <div className="view-switch" role="tablist" aria-label="Visualização">{VIEWS.filter(([v]) => v !== 'semana').map(([v, label]) => <button key={v} role="tab" aria-selected={modo === v} className={modo === v ? 'selected' : ''} onClick={() => setView(v)}>{label}</button>)}</div>
        <button className="status-btn" onClick={() => setAnchor(iso(new Date()))}>Hoje</button>
        <button className="status-btn primary" onClick={() => novoBloqueio(anchor)}><Lock size={15} />Bloquear</button>
      </div>
      {modo === 'dia'
        ? site && <WeekStrip semana={semana} anchor={anchor} site={site} list={list ?? []} blocks={blocks} onPick={setAnchor} onShift={n => setAnchor(somarDias(anchor, n))} />
        : <div className="agenda-nav">
          <button className="status-btn icon" onClick={() => setAnchor(somarDias(anchor, -passo))} aria-label="Período anterior"><ChevronLeft size={18} /></button>
          <strong className="agenda-period">A partir de {dataLonga(dias[0])}</strong>
          <button className="status-btn icon" onClick={() => setAnchor(somarDias(anchor, passo))} aria-label="Próximo período"><ChevronRight size={18} /></button>
        </div>}
      {list && modo === 'dia' && <p className="m-summary"><strong>{anchor === iso(new Date()) ? 'Hoje' : maiuscula(dataLonga(anchor))}</strong><span>{ativos.length ? `${ativos.length} ${ativos.length === 1 ? 'atendimento' : 'atendimentos'} · ${horas}` : 'Nenhum atendimento'}</span></p>}
    </div>
    : <div className="agenda-toolbar">
      <div className="view-switch" role="tablist" aria-label="Visualização">{VIEWS.map(([v, label]) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'selected' : ''} onClick={() => setView(v)}>{label}</button>)}</div>
      <div className="agenda-nav">
        <button className="status-btn icon" onClick={() => setAnchor(somarDias(anchor, -passo))} aria-label="Período anterior"><ChevronLeft size={18} /></button>
        <button className="status-btn" onClick={() => setAnchor(iso(new Date()))}>Hoje</button>
        <button className="status-btn icon" onClick={() => setAnchor(somarDias(anchor, passo))} aria-label="Próximo período"><ChevronRight size={18} /></button>
        <strong className="agenda-period">{modo === 'lista' ? `A partir de ${dataLonga(dias[0])}` : rotuloPeriodo(modo, dias)}</strong>
      </div>
      <button className="button agenda-lock" onClick={() => setBlockDraft({ tipo: 'dia', data: view === 'dia' ? anchor : iso(new Date()), inicio: '12:00', fim: '13:00', diaInteiro: false, motivo: '' })}><Lock size={16} />Bloquear horário</button>
    </div>}
    {error && <ErrorBox message={error} retry={reload} />}
    {list && !narrow && <div className="stats compact"><div><span>Atendimentos no período</span><b>{ativos.length}</b></div><div><span>Horas ocupadas</span><b>{horas}</b></div><div><span>Desmarcados</span><b>{visiveis.length - ativos.length}</b></div><div><span>Bloqueios ativos</span><b>{blocks.length}</b></div></div>}
    {!list || !site ? <Loading text="Montando a agenda…" />
      : modo === 'lista' ? <AgendaList list={list} onOpen={setSelected} />
        : <Calendar ppm={narrow ? 1.5 : PX_POR_MIN} onSwipe={narrow && modo === 'dia' ? n => setAnchor(somarDias(anchor, n)) : undefined} dias={dias} site={site} list={list} blocks={blocks} onOpen={setSelected} onOpenBlock={setBlockOpen}
          onEmpty={(data, inicio) => setBlockDraft({ tipo: 'dia', data, inicio, fim: deMinutos(Math.min(paraMinutos(inicio) + 60, 24 * 60)), diaInteiro: false, motivo: '' })} />}
    {list && <BlockList blocks={blocks} onOpen={setBlockOpen} onNew={() => setBlockDraft({ tipo: 'semanal', diaSemana: 6, data: iso(new Date()), inicio: '14:00', fim: '24:00', diaInteiro: false, motivo: '' })} />}

    <BookingDialog booking={selected} onClose={() => setSelected(null)} onChange={change} />
    {site && blockDraft && <BlockDialog draft={blockDraft} site={site} onClose={() => setBlockDraft(null)} onSaved={() => { setBlockDraft(null); notify('Horário bloqueado. Ele some do site para novos agendamentos.'); reload(); }} session={session} />}
    <Dialog open={!!blockOpen} onOpenChange={o => { if (!o) setBlockOpen(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Horário bloqueado</DialogTitle><DialogDescription>{blockOpen && descreverBloqueio(blockOpen)}</DialogDescription></DialogHeader>
        {blockOpen?.motivo && <p className="dialog-note">“{blockOpen.motivo}”</p>}
        <DialogFooter><button className="status-btn" onClick={() => setBlockOpen(null)}>Fechar</button><button className="status-btn danger" onClick={() => blockOpen && removeBlock(blockOpen)}><Unlock size={15} />Liberar horário</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

/** Faixa da semana (celular): toque num dia para abrir; o número mostra quantos atendimentos ele tem. */
function WeekStrip({ semana, anchor, site, list, blocks, onPick, onShift }: { semana: string[]; anchor: string; site: SiteConfig; list: Booking[]; blocks: Block[]; onPick: (d: string) => void; onShift: (dias: number) => void }) {
  const hoje = iso(new Date());
  const mes = maiuscula(paraData(anchor).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  return <div className="week-strip">
    <div className="week-strip-head">
      <button className="status-btn icon" onClick={() => onShift(-7)} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
      <strong>{mes}</strong>
      <button className="status-btn icon" onClick={() => onShift(7)} aria-label="Próxima semana"><ChevronRight size={18} /></button>
    </div>
    <div className="week-strip-days">{semana.map(d => {
      const dt = paraData(d);
      const fechado = site.horarios.diasFechados.includes(dt.getDay()) || diaInteiroBloqueado(blocks, d, site.horarios);
      const n = list.filter(a => a.data === d && a.status !== 'Cancelado').length;
      return <button key={d} className={[d === anchor && 'selected', d === hoje && 'today', fechado && 'closed'].filter(Boolean).join(' ')} aria-pressed={d === anchor} aria-label={`${dataLonga(d)}${fechado ? ', fechado' : `, ${n} atendimentos`}`} onClick={() => onPick(d)}>
        <small>{diaSemanaCurto(dt)}</small><b>{dt.getDate()}</b><i>{fechado ? '–' : n || ''}</i>
      </button>;
    })}</div>
  </div>;
}

/** Calendário em colunas por dia, com barras do tamanho de cada atendimento (como o Google Agenda). */
function Calendar({ dias, site, list, blocks, onOpen, onOpenBlock, onEmpty, ppm = PX_POR_MIN, onSwipe }: { ppm?: number; onSwipe?: (dias: number) => void; dias: string[]; site: SiteConfig; list: Booking[]; blocks: Block[]; onOpen: (b: Booking) => void; onOpenBlock: (b: Block) => void; onEmpty: (data: string, inicio: string) => void }) {
  const abre = Math.floor(paraMinutos(site.horarios.abre) / 60) * 60;
  const fecha = Math.ceil(paraMinutos(site.horarios.fecha) / 60) * 60;
  const altura = (fecha - abre) * ppm;
  const toque = useRef<{ x: number; y: number } | null>(null);
  const horas = Array.from({ length: (fecha - abre) / 60 + 1 }, (_, i) => abre + i * 60);
  const hoje = iso(new Date()); const agora = new Date(); const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const y = (min: number) => (Math.min(Math.max(min, abre), fecha) - abre) * ppm;
  const cols = `52px repeat(${dias.length}, minmax(${dias.length > 1 ? 110 : 0}px, 1fr))`;
  return <div className={`calendar ${dias.length > 1 ? 'cal-week' : 'cal-day'}`}
    onTouchStart={e => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
    onTouchEnd={e => { const t = toque.current; toque.current = null; if (!t || !onSwipe) return; const dx = e.changedTouches[0].clientX - t.x; const dy = e.changedTouches[0].clientY - t.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1); }}>
    <div className="calendar-scroll">
      <div className="cal-head" style={{ gridTemplateColumns: cols }}>
        <span />
        {dias.map(d => { const dt = paraData(d); return <div key={d} className={`cal-day-head ${d === hoje ? 'today' : ''}`}><small>{diaSemanaCurto(dt)}</small><b>{dt.getDate()}</b></div>; })}
      </div>
      <div className="cal-body" style={{ gridTemplateColumns: cols, height: altura }}>
        <div className="cal-hours">{horas.map(h => <span key={h} style={{ top: y(h) }}>{deMinutos(h)}</span>)}</div>
        {dias.map(d => {
          const fechado = site.horarios.diasFechados.includes(paraData(d).getDay());
          const travas = bloqueiosDoDia(blocks, d);
          const eventos = colunasSobrepostas(list.filter(a => a.data === d).map(a => ({ a, inicio: paraMinutos(a.hora), fim: paraMinutos(a.hora) + (a.duracao || 60) })));
          return <div key={d} className={`cal-col ${d === hoje ? 'today' : ''}`} style={{ backgroundSize: `100% ${60 * ppm}px` }}
            onClick={e => { if (e.target !== e.currentTarget || fechado) return; const r = e.currentTarget.getBoundingClientRect(); const min = abre + Math.floor((e.clientY - r.top) / ppm / 30) * 30; onEmpty(d, deMinutos(min)); }}>
            {fechado && <div className="cal-closed"><span>Fechado</span></div>}
            {!fechado && travas.map(b => <button key={b.id} className="cal-block" style={{ top: y(paraMinutos(b.inicio)), height: Math.max(y(paraMinutos(b.fim)) - y(paraMinutos(b.inicio)), 14) }} onClick={() => onOpenBlock(b)}><Lock size={12} /><span>{b.motivo || 'Bloqueado'}</span></button>)}
            {eventos.map(({ item: { a, inicio, fim }, coluna, total }) => <button key={a.id} className={`cal-event ${a.status === 'Cancelado' ? 'cancelled' : ''}`} onClick={() => onOpen(a)}
              style={{ top: y(inicio) + 1, height: Math.max(y(fim) - y(inicio) - 2, 22), left: `calc(${(coluna / total) * 100}% + 2px)`, width: `calc(${100 / total}% - 4px)` }}>
              <b>{a.hora}{total === 1 && `–${fimDe(a)}`}</b><span>{a.servico}</span><small>{a.cliente}{profDe(a) ? ` · ${profDe(a)}` : ''}</small>
            </button>)}
            {d === hoje && agoraMin >= abre && agoraMin <= fecha && <span className="cal-now" style={{ top: y(agoraMin) }} />}
          </div>;
        })}
      </div>
    </div>
    <p className="cal-hint"><Lock size={13} />{onSwipe ? 'Deslize para o lado para trocar de dia. Toque num horário vazio para bloquear.' : 'Toque num espaço vazio da agenda para bloquear aquele horário.'}</p>
  </div>;
}

function AgendaList({ list, onOpen }: { list: Booking[]; onOpen: (b: Booking) => void }) {
  const byDay = list.reduce<Record<string, Booking[]>>((acc, a) => ({ ...acc, [a.data]: [...(acc[a.data] ?? []), a] }), {});
  if (!list.length) return <Empty title="Agenda livre" action={presentation ? <a className="button" href="#/agendar">Fazer um agendamento</a> : undefined}>Nenhum agendamento nesse período.</Empty>;
  return <>{Object.entries(byDay).map(([day, items]) => <section key={day} className="agenda-day">
    <h2>{day === iso(new Date()) ? 'Hoje · ' : ''}{dataLonga(day)}</h2>
    {items.map(a => {
      const details = (a.extras ?? []).map(x => `${x.rotulo}: ${x.valor}`).join(' · ');
      return <button key={a.id} className={`agenda-item agenda-${a.status}`} onClick={() => onOpen(a)}>
        <div className="agenda-time">{a.hora}<small>até {fimDe(a)}</small></div>
        <div className="agenda-info"><strong>{a.servico}</strong><span>{a.cliente}{a.telefone && ` · ${mascaraTelefone(a.telefone)}`}</span>{details && <small>{details}</small>}{a.obs && <small className="agenda-obs">“{a.obs}”</small>}</div>
        <span className={`status status-${a.status}`}>{a.status === 'Cancelado' ? 'Desmarcado' : 'Agendado'}</span>
      </button>;
    })}
  </section>)}</>;
}

/** Detalhes do atendimento. Não há confirmação: para desmarcar, a equipe fala com o cliente antes. */
function BookingDialog({ booking: a, onClose, onChange }: { booking: Booking | null; onClose: () => void; onChange: (b: Booking, s: Status) => void }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [a?.id, a?.status]);
  const prof = a ? profDe(a) : '';
  const aviso = a ? `Olá, ${a.cliente}! Aqui é do ${brand.fullName}. Sobre o seu horário de ${a.servico}${prof ? ` com ${prof}` : ''} em ${dataLonga(a.data)} às ${a.hora}: ` : '';
  return <Dialog open={!!a} onOpenChange={o => { if (!o) onClose(); }}>
    <DialogContent>
      {a && <>
        <DialogHeader>
          <DialogTitle>{a.servico}{prof ? ` · com ${prof}` : ''}</DialogTitle>
          <DialogDescription>{dataLonga(a.data)} · {a.hora} às {fimDe(a)} ({duracaoTexto(a.duracao || 60)})</DialogDescription>
        </DialogHeader>
        <dl className="booking-facts">
          <div><dt>Cliente</dt><dd>{a.cliente}</dd></div>
          {a.telefone && <div><dt>WhatsApp</dt><dd>{mascaraTelefone(a.telefone)}</dd></div>}
          {(a.extras ?? []).map(x => <div key={x.rotulo}><dt>{x.rotulo}</dt><dd>{x.valor}</dd></div>)}
          {a.obs && <div className="wide"><dt>Observação</dt><dd>“{a.obs}”</dd></div>}
          <div><dt>Situação</dt><dd><span className={`status status-${a.status}`}>{a.status === 'Cancelado' ? 'Desmarcado' : 'Agendado'}</span></dd></div>
          <div><dt>Código</dt><dd>{a.id}</dd></div>
        </dl>
        {a.status !== 'Cancelado' && <p className="dialog-note"><MessageCircle size={15} />Precisa desmarcar? Combine com o cliente primeiro pelo WhatsApp.</p>}
        <DialogFooter>
          {a.telefone && <a className="status-btn primary" href={contatoCliente(a, aviso)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />Chamar no WhatsApp</a>}
          {a.status === 'Cancelado'
            ? <button className="status-btn primary" onClick={() => onChange(a, 'Agendado')}><RotateCcw size={15} />Voltar para a agenda</button>
            : confirming ? <button className="status-btn danger" onClick={() => onChange(a, 'Cancelado')}>Desmarcar mesmo?</button>
              : <button className="status-btn" onClick={() => setConfirming(true)}><X size={15} />Desmarcar</button>}
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}

type BlockDraft = { tipo: 'dia' | 'semanal'; data?: string; diaSemana?: number; inicio: string; fim: string; diaInteiro: boolean; motivo: string };
function BlockDialog({ draft, site, session, onClose, onSaved }: { draft: BlockDraft; site: SiteConfig; session: Session; onClose: () => void; onSaved: () => void }) {
  const [b, setB] = useState<BlockDraft>({ ...draft, diaSemana: draft.diaSemana ?? paraData(draft.data ?? iso(new Date())).getDay() });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const abre = Math.floor(paraMinutos(site.horarios.abre) / 60) * 60; const fecha = Math.ceil(paraMinutos(site.horarios.fecha) / 60) * 60;
  const opcoes = Array.from({ length: (fecha - abre) / 30 + 1 }, (_, i) => deMinutos(abre + i * 30));
  const fimOpcoes = [...opcoes.filter(o => o > b.inicio), '24:00'];
  const set = (p: Partial<BlockDraft>) => setB(x => ({ ...x, ...p }));
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await saveBlock(session.token, { tipo: b.tipo, data: b.tipo === 'dia' ? b.data : undefined, diaSemana: b.tipo === 'semanal' ? b.diaSemana : undefined, inicio: b.diaInteiro ? DIA_INTEIRO.inicio : b.inicio, fim: b.diaInteiro ? DIA_INTEIRO.fim : b.fim, motivo: b.motivo.trim() });
      onSaved();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
    <DialogContent>
      <form className="form block-form" onSubmit={save}>
        <DialogHeader><DialogTitle>Bloquear horário</DialogTitle><DialogDescription>O horário some do site e ninguém consegue agendar nele.</DialogDescription></DialogHeader>
        <fieldset className="segmented-field"><legend>Repetir</legend><span className="segmented">
          <button type="button" aria-pressed={b.tipo === 'dia'} className={b.tipo === 'dia' ? 'selected' : ''} onClick={() => set({ tipo: 'dia' })}>Só neste dia</button>
          <button type="button" aria-pressed={b.tipo === 'semanal'} className={b.tipo === 'semanal' ? 'selected' : ''} onClick={() => set({ tipo: 'semanal' })}>Toda semana</button>
        </span></fieldset>
        {b.tipo === 'dia'
          ? <Field id="bl-data" label="Data"><Input id="bl-data" type="date" required value={b.data ?? ''} onChange={e => set({ data: e.target.value })} /></Field>
          : <Field id="bl-dia" label="Dia da semana"><Select value={String(b.diaSemana)} onValueChange={v => set({ diaSemana: Number(v) })}><SelectTrigger id="bl-dia" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{DIAS_DA_SEMANA.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></Field>}
        <div className="check-field"><Checkbox id="bl-inteiro" checked={b.diaInteiro} onCheckedChange={v => set({ diaInteiro: v === true })} /><Label htmlFor="bl-inteiro" className="grid gap-0.5 text-sm font-bold leading-snug cursor-pointer">Dia inteiro<small>Fecha a agenda o dia todo (feriado, folga, curso…).</small></Label></div>
        {!b.diaInteiro && <div className="form-grid">
          <Field id="bl-ini" label="Das"><Select value={b.inicio} onValueChange={v => set({ inicio: v, fim: b.fim > v ? b.fim : deMinutos(Math.min(paraMinutos(v) + 60, 24 * 60)) })}><SelectTrigger id="bl-ini" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{opcoes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
          <Field id="bl-fim" label="Até"><Select value={b.fim} onValueChange={v => set({ fim: v })}><SelectTrigger id="bl-fim" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{fimOpcoes.map(o => <SelectItem key={o} value={o}>{o === '24:00' ? 'Fim do dia' : o}</SelectItem>)}</SelectContent></Select></Field>
        </div>}
        <Field id="bl-motivo" label="Motivo" optional hint="Só a equipe vê. Ex.: almoço, curso, sábado só até as 14h."><Input id="bl-motivo" maxLength={80} value={b.motivo} onChange={e => set({ motivo: e.target.value })} placeholder="Ex.: Almoço da equipe" /></Field>
        {error && <ErrorBox message={error} />}
        <DialogFooter><button type="button" className="status-btn" onClick={onClose}>Cancelar</button><button className="status-btn primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <Lock size={15} />}Bloquear</button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function BlockList({ blocks, onOpen, onNew }: { blocks: Block[]; onOpen: (b: Block) => void; onNew: () => void }) {
  const ordenados = [...blocks].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'semanal' ? -1 : 1) || String(a.data ?? a.diaSemana).localeCompare(String(b.data ?? b.diaSemana)));
  return <section className="admin-card blocks-card">
    <div className="admin-card-head blocks-head"><div><h2>Horários bloqueados</h2><p>Folgas, almoço, feriados e dias com horário reduzido. Toque para liberar.</p></div><button className="status-btn" onClick={onNew}><Plus size={15} />Novo bloqueio</button></div>
    {ordenados.length ? <ul className="blocks-list">{ordenados.map(b => <li key={b.id}><button onClick={() => onOpen(b)}><Lock size={15} /><span><strong>{descreverBloqueio(b)}</strong>{b.motivo && <small>{b.motivo}</small>}</span>{b.tipo === 'semanal' && <em>toda semana</em>}</button></li>)}</ul>
      : <p className="muted">Nenhum horário bloqueado. Toda a agenda está aberta para o site.</p>}
  </section>;
}

// ---------- Painel: serviços e categorias ----------
function useAdminCatalog(session: Session, onLogout: () => void, revision = 0) {
  const [data, setData] = useState<Catalog | null>(null); const [error, setError] = useState(''); const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; setError('');
    adminServices(session.token).then(r => { if (live) setData(r); }).catch(err => { if (!live) return; if (/Sessão|login/i.test(err.message)) onLogout(); else setError(err.message); });
    return () => { live = false; };
  }, [session.token, onLogout, revision, tick]);
  return { data, error, reload: () => setTick(n => n + 1) };
}
function CategoryManager({ session, categorias, servicos, notify, onChange }: { session: Session; categorias: string[]; servicos: Service[]; notify: Notify; onChange: () => void }) {
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [removing, setRemoving] = useState<string | null>(null);
  async function add(e: FormEvent) {
    e.preventDefault(); const clean = nomeCategoria(name);
    if (!clean) { setError('Digite o nome da categoria, com 2 a 40 letras.'); return; }
    if (categorias.some(c => sameText(c, clean))) { setError('Essa categoria já existe.'); return; }
    setBusy(true); setError('');
    try { await createCategory(session.token, clean); setName(''); notify(`Categoria “${clean}” criada.`); onChange(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function remove(c: string) {
    setBusy(true); setError('');
    try { await deleteCategory(session.token, c); setRemoving(null); notify(`Categoria “${c}” excluída.`); onChange(); } catch (err) { setError((err as Error).message); setRemoving(null); } finally { setBusy(false); }
  }
  return <section className="admin-card">
    <div className="admin-card-head"><h2>Categorias</h2><p>Organizam os serviços no site. Ex.: Cabelo, Unhas, Estética.</p></div>
    <ul className="category-list">{categorias.map(c => {
      const used = servicos.filter(s => s.categoria === c).length;
      return <li key={c}><span>{c}<small>{used} {used === 1 ? 'serviço' : 'serviços'}</small></span>
        {removing === c
          ? <button className="status-btn danger" disabled={busy} onClick={() => remove(c)}>Excluir?</button>
          : <button className="status-btn icon" onClick={() => setRemoving(c)} aria-label={`Excluir categoria ${c}`}><Trash2 size={16} /></button>}
      </li>;
    })}</ul>
    <form className="inline-add" onSubmit={add}><Input value={name} onChange={e => { setName(e.target.value); setError(''); }} maxLength={40} placeholder="Nova categoria, ex.: Noivas" aria-label="Nome da nova categoria" /><button className="button" disabled={busy}><Plus size={17} />Adicionar</button></form>
    {error && <ErrorBox message={error} />}
  </section>;
}
function ServicesView({ session, onLogout, notify, revision }: { session: Session; onLogout: () => void; notify: Notify; revision: number }) {
  const { data, error, reload } = useAdminCatalog(session, onLogout, revision);
  const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => { if (!removing) return; const t = setTimeout(() => setRemoving(null), 3500); return () => clearTimeout(t); }, [removing]);
  async function remove(s: Service) {
    try { await deleteService(session.token, s.id); notify(`“${s.nome}” excluído.`); reload(); } catch (err) { notify((err as Error).message, true); }
    setRemoving(null);
  }
  async function toggle(s: Service) {
    try { await saveService(session.token, { ...s, ativo: s.ativo === false }); notify(s.ativo === false ? `“${s.nome}” voltou para o site.` : `“${s.nome}” escondido do site.`); reload(); } catch (err) { notify((err as Error).message, true); }
  }
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!data) return <Loading text="Carregando os serviços…" />;
  const groups = agruparPorCategoria(data.servicos, data.categorias);
  return <>
    <div className="admin-list-head"><div><h2>Serviços <span className="count-pill">{data.servicos.length}</span></h2><p>O que aparece no site para agendar, com preço e duração.</p></div><a className="button" href="#/admin/servicos/novo"><Plus size={18} />Novo serviço</a></div>
    {!data.servicos.length ? <Empty title="Nenhum serviço ainda" action={<a className="button" href="#/admin/servicos/novo">Cadastrar o primeiro</a>}>Cadastre corte, escova e os outros serviços do salão.</Empty>
      : groups.map(g => <section key={g.categoria} className="service-group">
        <h3>{g.categoria}</h3>
        {g.servicos.map(s => <article key={s.id} className={`service-row ${s.ativo === false ? 'hidden-service' : ''}`}>
          <span className="service-row-media">{s.foto ? <img src={s.foto} alt="" /> : <ServiceIcon icone={s.icone} />}</span>
          <div className="service-row-info"><strong>{s.nome}{s.ativo === false && <span className="badge-hidden">Escondido</span>}</strong><small>{duracaoTexto(s.duracao)}{s.preco && ` · ${s.preco}`}</small></div>
          <div className="service-row-actions">
            <button className="status-btn icon" onClick={() => toggle(s)} aria-label={s.ativo === false ? `Mostrar ${s.nome} no site` : `Esconder ${s.nome} do site`} title={s.ativo === false ? 'Mostrar no site' : 'Esconder do site'}>{s.ativo === false ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            <a className="status-btn" href={`#/admin/servicos/${encodeURIComponent(s.id)}`}><Pencil size={15} />Editar</a>
            {removing === s.id ? <button className="status-btn danger" onClick={() => remove(s)}>Excluir?</button> : <button className="status-btn icon" onClick={() => setRemoving(s.id)} aria-label={`Excluir ${s.nome}`}><Trash2 size={16} /></button>}
          </div>
        </article>)}
      </section>)}
    <CategoryManager session={session} categorias={data.categorias} servicos={data.servicos} notify={notify} onChange={reload} />
  </>;
}
const NONE = '__sem__'; const NEW = '__nova__';
function ServiceForm({ session, id, onLogout, notify }: { session: Session; id?: string; onLogout: () => void; notify: Notify }) {
  const { data, error: loadError } = useAdminCatalog(session, onLogout);
  const original = id ? data?.servicos.find(s => s.id === id) : undefined;
  const [draft, setDraft] = useState<Service | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false); const [optimizing, setOptimizing] = useState(false); const [error, setError] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  useEffect(() => {
    if (!data || draft) return;
    setDraft(original ? { ...original } : { id: '', nome: '', descricao: '', duracao: 60, preco: '', icone: 'tesoura', foto: '', categoria: data.categorias[0] ?? '', ativo: true });
  }, [data, original, draft]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  if (loadError) return <ErrorBox message={loadError} />;
  if (!data || !draft) return <Loading />;
  if (id && !original) return <Empty title="Serviço não encontrado" action={<a className="button" href="#/admin/servicos">Voltar aos serviços</a>} />;
  const set = (patch: Partial<Service>) => setDraft({ ...draft, ...patch });
  async function choose(files: FileList | null) {
    if (!files?.length) return;
    setOptimizing(true); setError('');
    try { const blob = await optimizeImage(files[0]); setPhoto({ blob, url: URL.createObjectURL(blob) }); } catch (err) { setError((err as Error).message); } finally { setOptimizing(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!draft) return;
    if (!draft.nome.trim()) { setError('Preencha o nome do serviço.'); return; }
    setBusy(true); setError('');
    try {
      let categoria = draft.categoria ?? '';
      if (newCategory !== null) {
        const clean = nomeCategoria(newCategory); if (!clean) throw new Error('Digite o nome da nova categoria.');
        const existing = data!.categorias.find(c => sameText(c, clean));
        if (!existing) await createCategory(session.token, clean);
        categoria = existing ?? clean;
      }
      await saveService(session.token, { ...draft, categoria }, photo?.blob);
      notify(id ? 'Serviço atualizado.' : 'Serviço cadastrado. Já aparece no site.'); window.location.hash = '#/admin/servicos';
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const preview: Service = { ...draft, nome: draft.nome || 'Nome do serviço', descricao: draft.descricao || 'Descreva o que está incluído.', foto: photo?.url ?? draft.foto };
  return <>
    <a className="back-link" href="#/admin/servicos"><ArrowLeft size={16} />Voltar aos serviços</a>
    <div className="service-form-grid">
      <form className="form admin-card" onSubmit={submit}>
        <div className="admin-card-head"><h2>{id ? 'Editar serviço' : 'Novo serviço'}</h2><p>Os campos com * são obrigatórios.</p></div>
        <div className="form-grid">
          <Field id="s-nome" label="Nome do serviço *" className="wide"><Input id="s-nome" required maxLength={80} value={draft.nome} onChange={e => set({ nome: e.target.value })} placeholder="Ex.: Corte e escova" /></Field>
          <Field id="s-cat" label="Categoria">
            {newCategory === null
              ? <Select value={draft.categoria || NONE} onValueChange={v => { if (v === NEW) setNewCategory(''); else set({ categoria: v === NONE ? '' : v }); }}>
                <SelectTrigger id="s-cat" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Sem categoria</SelectItem>{data.categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}<SelectItem value={NEW}>+ Nova categoria…</SelectItem></SelectContent>
              </Select>
              : <span className="inline-add"><Input id="s-cat" autoFocus maxLength={40} value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nome da categoria" /><button type="button" className="status-btn icon" onClick={() => setNewCategory(null)} aria-label="Cancelar nova categoria"><X size={16} /></button></span>}
          </Field>
          <Field id="s-preco" label="Preço" hint={'Texto livre: "R$ 40", "a partir de R$ 55", "sob consulta".'}><Input id="s-preco" maxLength={40} value={draft.preco} onChange={e => set({ preco: e.target.value })} placeholder="Ex.: a partir de R$ 55" /></Field>
          <fieldset className="segmented-field"><legend>Duração</legend><span className="segmented">{DURACOES.map(d => <button type="button" key={d} aria-pressed={draft.duracao === d} className={draft.duracao === d ? 'selected' : ''} onClick={() => set({ duracao: d })}>{duracaoTexto(d)}</button>)}</span></fieldset>
          <Field id="s-desc" label="Descrição" className="wide"><Textarea id="s-desc" rows={3} maxLength={300} value={draft.descricao} onChange={e => set({ descricao: e.target.value })} placeholder="O que está incluído, quanto tempo leva…" /></Field>
          <fieldset className="segmented-field"><legend>Ícone</legend><span className="icon-picker">{SERVICE_ICONS.map(i => <button type="button" key={i} aria-pressed={draft.icone === i} aria-label={`Ícone ${i}`} className={draft.icone === i ? 'selected' : ''} onClick={() => set({ icone: i })}><ServiceIcon icone={i} /></button>)}</span></fieldset>
          <div className="wide photo-field">
            <span className="field-label">Foto <span className="optional">(opcional)</span></span>
            <div className="photo-row">
              <span className="photo-thumb">{photo?.url || draft.foto ? <img src={photo?.url || draft.foto} alt="" /> : <ImagePlus size={24} strokeWidth={1.5} />}</span>
              <label className="button button-outline file-button"><ImagePlus size={17} />{optimizing ? 'Comprimindo…' : photo || draft.foto ? 'Trocar foto' : 'Escolher foto'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { choose(e.target.files); e.target.value = ''; }} /></label>
              {(photo || draft.foto) && <button type="button" className="text-button" onClick={() => { setPhoto(null); set({ foto: '' }); }}>Remover</button>}
            </div>
          </div>
          <div className="check-field wide"><Checkbox id="s-ativo" checked={draft.ativo !== false} onCheckedChange={v => set({ ativo: v === true })} /><Label htmlFor="s-ativo" className="grid gap-0.5 text-sm font-bold leading-snug cursor-pointer">Aparece no site<small>Desmarque para esconder sem apagar.</small></Label></div>
        </div>
        {error && <ErrorBox message={error} />}
        <div className="step-actions"><a className="button button-outline" href="#/admin/servicos">Cancelar</a><button className="button" disabled={busy || optimizing}>{busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{busy ? 'Salvando…' : 'Salvar serviço'}</button></div>
      </form>
      <aside className="service-preview"><span className="eyebrow"><Eye size={14} /> COMO FICA NO SITE</span><ServiceCard service={preview} /></aside>
    </div>
  </>;
}

function Panel({ session, route, onLogout, notify }: { session: Session; route: string; onLogout: () => void; notify: Notify }) {
  const [revision, setRevision] = useState(0);
  const section = route.startsWith('/admin/servicos') ? 'servicos' : 'agenda';
  const serviceId = route.startsWith('/admin/servicos/') ? decodeURIComponent(route.slice('/admin/servicos/'.length)) : '';
  return <main className="wrap page admin" id="main">
    <div className="admin-heading">
      <div><span className="eyebrow">PAINEL DA EQUIPE</span><h1>Olá, <em>{session.nome}.</em></h1></div>
      <div className="admin-actions"><button className="button button-outline" aria-label="Atualizar" onClick={() => setRevision(n => n + 1)}><RefreshCw size={16} /><span className="hide-narrow">Atualizar</span></button>{!presentation && <button className="button button-outline" onClick={onLogout}><LogOut size={16} />Sair</button>}</div>
    </div>
    {presentation && <div className="admin-demo-banner"><span><Flower2 size={18} />Painel de demonstração: veja a agenda, bloqueie horários, cadastre serviços e veja tudo mudar no site.</span><button className="text-button" onClick={() => { resetDemo(); setRevision(n => n + 1); notify('Exemplos restaurados.'); }}><RotateCcw size={15} />Restaurar exemplos</button></div>}
    <nav className="admin-tabs" aria-label="Seções do painel">
      <a href="#/admin" className={section === 'agenda' ? 'selected' : ''} aria-current={section === 'agenda' ? 'page' : undefined}><CalendarDays size={17} />Agenda</a>
      <a href="#/admin/servicos" className={section === 'servicos' ? 'selected' : ''} aria-current={section === 'servicos' ? 'page' : undefined}><Scissors size={17} />Serviços</a>
    </nav>
    {section === 'agenda' ? <AgendaView session={session} onLogout={onLogout} notify={notify} revision={revision} />
      : serviceId ? <ServiceForm key={serviceId} session={session} id={serviceId === 'novo' ? undefined : serviceId} onLogout={onLogout} notify={notify} />
        : <ServicesView session={session} onLogout={onLogout} notify={notify} revision={revision} />}
  </main>;
}
function AdminPage({ route, notify }: { route: string; notify: Notify }) {
  const [session, setSession] = useState<Session | null>(currentSession);
  const out = useCallback(() => { if (session) logout(session); setSession(null); }, [session]);
  return session ? <Panel session={session} route={route} onLogout={out} notify={notify} /> : <LoginPage onLogin={setSession} />;
}

// ---------- App ----------
function App() {
  const route = useRoute(); const site = useSite();
  const [toast, setToast] = useState<{ message: string; warning?: boolean } | null>(null);
  const notify = useCallback<Notify>((message, warning = false) => setToast({ message, warning }), []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  const admin = route.startsWith('/admin');
  if (presentation && route === '/') return <Suspense fallback={<main id="main" className="wrap"><Loading /></main>}><Pitch /></Suspense>;
  let content: ReactNode;
  if (admin) content = <AdminPage route={route} notify={notify} />;
  else if (route.startsWith('/agendar')) content = <BookPage key={route} preselected={decodeURIComponent(route.split('/')[2] || '')} />;
  else if (route === '/meu-agendamento') content = <MinePage />;
  else if (route === STORE) content = <Home {...site} />;
  else content = <main id="main" className="wrap"><Empty title="Página não encontrada" action={<a className="button" href={`#${STORE}`}>Voltar ao início</a>} /></main>;
  return <>
    <Header admin={admin} />
    {content}
    <Footer site={site.site} />
    {presentation && <Suspense fallback={null}><DemoBar route={route} /></Suspense>}
    {toast && <div className={`toast ${toast.warning ? 'toast-warning' : ''}`} role="status">{toast.warning ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}<span>{toast.message}</span><button className="small-icon" onClick={() => setToast(null)} aria-label="Fechar aviso"><X size={18} /></button></div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
