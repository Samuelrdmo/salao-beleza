import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, Store, LayoutDashboard, Palette, MessageCircle, Smartphone, ShieldCheck, Gem, Check, Instagram, Cloud, Wrench, Plus, Flower2, Scissors, Wind, Paintbrush, Users, CalendarDays, Clock, Bell, RefreshCw } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SplitText from './reactbits/SplitText';
import ShinyText from './reactbits/ShinyText';
import AnimatedContent from './reactbits/AnimatedContent';
import LogoLoop from './reactbits/LogoLoop';
import StarBorder from './reactbits/StarBorder';
import { client, presentation, STORE } from './config';
import { numeroValido as validPhone } from './domain';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// ---------- Paletas da apresentação ----------
export const THEMES = [
  { id: 'rose', name: 'Rosé', colors: ['#FBF5F2', '#3A1D2A', '#B4627A'] },
  { id: 'nude', name: 'Nude', colors: ['#F7F1EA', '#2E2420', '#A67858'] },
  { id: 'lavanda', name: 'Lavanda', colors: ['#F6F3FB', '#2B2040', '#8A6BC4'] },
  { id: 'noite', name: 'Noite', colors: ['#171215', '#F5ECEF', '#E59BB0'] },
] as const;
const THEME_KEY = 'agenda-apresentacao-paleta';
function readTheme() { try { return localStorage.getItem(THEME_KEY) || 'rose'; } catch { return 'rose'; } }
function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem(THEME_KEY, id); } catch { /* opcional */ }
  window.dispatchEvent(new Event('vitrine-theme'));
}
if (presentation) document.documentElement.dataset.theme = readTheme();
function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => { const sync = () => setTheme(readTheme()); window.addEventListener('vitrine-theme', sync); return () => window.removeEventListener('vitrine-theme', sync); }, []);
  return [theme, applyTheme] as const;
}
function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  return <div className={`theme-picker ${compact ? 'compact' : ''}`} role="radiogroup" aria-label="Paleta de cores da loja">{THEMES.map(t => <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={theme === t.id ? 'selected' : ''} onClick={() => setTheme(t.id)} title={t.name}><span className="swatch" aria-hidden="true">{t.colors.map(c => <span key={c} style={{ background: c }} />)}</span>{!compact && <span>{t.name}</span>}<span className="sr-only">{compact ? t.name : ''}</span></button>)}</div>;
}

// ---------- Barra fixa da demonstração ----------
export function DemoBar({ route }: { route: string }) {
  const [open, setOpen] = useState(false);
  if (route === '/') return null;
  const inPanel = route.startsWith('/admin');
  return <nav className="demo-bar" aria-label="Navegação da apresentação">
    <a href="#/" className="demo-bar-back"><ArrowLeft size={16} /><span>Apresentação</span></a>
    <a href={`#${STORE}`} className={!inPanel ? 'current' : ''} aria-current={!inPanel ? 'page' : undefined}><Store size={16} /><span>Site</span></a>
    <a href="#/admin" className={inPanel ? 'current' : ''} aria-current={inPanel ? 'page' : undefined}><LayoutDashboard size={16} /><span>Agenda</span></a>
    <div className="demo-bar-palette"><button type="button" onClick={() => setOpen(!open)} aria-expanded={open}><Palette size={16} /><span>Cores</span></button>{open && <div className="demo-bar-popover"><span>Mesmo site, outra identidade:</span><ThemePicker /></div>}</div>
  </nav>;
}

// ---------- Página de venda ----------
const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const PET = { nome: 'Marina', servico: 'Corte e escova', hora: '10:00', prof: 'Bia' };
/** Título que entra palavra por palavra (React Bits SplitText). Sem animação para quem prefere menos movimento. */
function Words({ text, delay = 0, trigger = 'load' }: { text: string; delay?: number; trigger?: 'load' | 'view' }) {
  if (reduceMotion) return <>{text}</>;
  return <SplitText tag="span" text={text} splitType="words" effect="rise" mask delay={delay} duration={0.9} trigger={trigger} textAlign="inherit" />;
}
/** Bloco que sobe suavemente ao entrar na tela (React Bits AnimatedContent). */
function Reveal({ children, className, stagger = 0, delay = 0, distance = 36 }: { children: ReactNode; className?: string; stagger?: number; delay?: number; distance?: number }) {
  return <AnimatedContent className={className} distance={distance} duration={0.9} ease="power3.out" threshold={0.15} stagger={stagger} delay={delay}>{children}</AnimatedContent>;
}

/** Passo 1: a cliente escolhe o serviço. */
function MockServices() {
  return <div className="mock">
    <div className="mock-bar"><span className="mock-brand">ÍRIS</span><Flower2 size={12} /></div>
    <div className="mock-body">
      <small className="mock-category">QUAL SERVIÇO?</small>
      {[['Corte', 'a partir de R$ 70', Scissors], ['Corte e escova', 'a partir de R$ 110', Wind], ['Coloração', 'a partir de R$ 160', Paintbrush]].map(([nome, preco, Icon], i) => {
        const I = Icon as typeof Scissors;
        return <div key={String(nome)} className={`mock-service ${i === 1 ? 'mock-picked' : ''}`}><span className="mock-service-icon"><I size={13} /></span><span><b>{String(nome)}</b><small>{String(preco)}</small></span></div>;
      })}
    </div>
  </div>;
}
/** Passo 2: dia e horário, só os livres. */
function MockSlots() {
  const dias = [['qui', '27'], ['sex', '28'], ['sáb', '29'], ['ter', '2']];
  const horas = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  return <div className="mock">
    <div className="mock-bar"><span>Que dia?</span><CalendarDays size={12} /></div>
    <div className="mock-body">
      <div className="mock-days">{dias.map(([d, n], i) => <span key={n} className={i === 0 ? 'mock-picked' : ''}><small>{d}</small><b>{n}</b></span>)}</div>
      <small className="mock-category">QUE HORAS?</small>
      <div className="mock-hours">{horas.map((h, i) => <span key={h} className={i === 1 ? 'mock-picked mock-hour-pick' : i === 0 || i === 4 ? 'mock-taken' : ''}>{h}</span>)}</div>
      <div className="mock-button mock-confirm"><Check size={12} />Confirmar</div>
    </div>
  </div>;
}
/** Passo 3: o agendamento aparece na agenda da equipe. */
function MockAgenda() {
  return <div className="mock">
    <div className="mock-bar"><span>Agenda de hoje</span><RefreshCw size={12} /></div>
    <div className="mock-body">
      <div className="mock-agenda"><b>09:00</b><span><strong>Mechas</strong><small>Carla · com Lu</small></span><i className="ok">Agendado</i></div>
      <div className="mock-agenda mock-new-row"><b>10:00</b><span><strong>{PET.servico}</strong><small>{PET.nome} · com {PET.prof}</small></span><i className="mock-status">Novo</i></div>
      <div className="mock-agenda"><b>14:00</b><span><strong>Manicure</strong><small>Fernanda · com Carol</small></span><i className="ok">Agendado</i></div>
    </div>
  </div>;
}

const howItWorks = [
  { mock: <MockServices />, title: 'A cliente escolhe o serviço', text: 'Corte, escova, cor e unhas: com preço e duração.' },
  { mock: <MockSlots />, title: 'Marca dia e horário', text: 'Só aparecem os horários livres. Sem conflito.' },
  { mock: <MockAgenda />, title: 'Cai na sua agenda', text: 'Aparece na hora, no calendário. Sem precisar confirmar.' },
];
const included = [
  { icon: CalendarDays, label: 'Agenda aberta 24 horas' },
  { icon: Clock, label: 'Só horários livres' },
  { icon: Smartphone, label: 'Agenda no celular' },
  { icon: MessageCircle, label: 'Contato no WhatsApp' },
  { icon: Users, label: 'Escolha da profissional' },
  { icon: Gem, label: 'Sua logo e suas cores' },
  { icon: Bell, label: 'Aviso de novo horário' },
  { icon: ShieldCheck, label: 'Painel com senha' },
];
const marquee = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12']
  .map(name => ({ src: `/images/${name}.jpg`, alt: '' }));
const plans = [
  { name: 'Sem mensalidade', price: 'R$ 0', unit: '/mês', text: 'Estrutura gratuita, na conta da sua loja.' },
  { name: 'Estrutura dedicada', price: 'Sob medida', unit: '', text: 'Hospedagem e banco de dados pagos, no seu nome.' },
];
const faq = [
  ['E se dois clientes escolherem o mesmo horário?', 'Não acontece: quem agendar primeiro fica com a vaga, e o horário some para os outros.'],
  ['Dá para atender várias clientes no mesmo horário?', 'Dá. Você define quantas atendem ao mesmo tempo (uma por profissional), as folgas e o horário de funcionamento.'],
  ['E se eu precisar fechar mais cedo num dia?', 'Você bloqueia o horário, o período ou o dia inteiro na agenda, e ele some do site na hora.'],
  ['Preciso entender de tecnologia?', 'Não. Você acompanha a agenda pelo celular, como um aplicativo.'],
  ['Posso ter um domínio .com.br?', 'Pode. O domínio é opcional e pago à parte.'],
];
const onboarding = ['Envie sua marca', 'Montamos o site', 'Comece a vender'];
const siteIncludes = ['Design com a sua identidade', 'Site e agenda prontos', 'Configuração e publicação'];

/** Preço do site (client.json → pitch). "R$ 1.200" sem centavos quando o valor é inteiro. */
const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
function readOffer() {
  const p = client.pitch;
  if (!p?.price) return null;
  const promo = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : null;
  return { priceValue: p.price, promoValue: promo, price: brl(p.price), promo: promo ? brl(promo) : null, off: promo ? Math.round((1 - promo / p.price) * 100) : 0, label: p.promoLabel || 'Oferta', note: p.promoNote || '' };
}
const offer = readOffer();
const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

export function Pitch() {
  const pitch = client.pitch ?? { productName: 'Vitrine', whatsapp: '', instagram: '' };
  const phone = pitch.whatsapp.replace(/\D/g, '');
  const viaWhatsApp = validPhone(phone);
  const contactHref = viaWhatsApp ? `https://wa.me/${phone}?text=${encodeURIComponent(`Olá! Vi a apresentação da ${pitch.productName}${offer?.promo ? ` e a oferta de ${offer.label}` : ''} e quero um site para o meu salão.`)}` : pitch.instagram;
  const ctaLabel = offer?.promo ? 'Quero aproveitar' : 'Quero o meu site';
  const ContactIcon = viaWhatsApp ? MessageCircle : Instagram;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { document.title = client.seo.title; }, []);

  useGSAP(() => {
    // Barra fixa do celular: aparece depois da abertura e some na chamada final (não é animação, vale para todos).
    ScrollTrigger.create({ trigger: '.pitch-hero', start: 'bottom 80px', endTrigger: '.pitch-final', end: 'top bottom', toggleClass: { targets: '.pitch-sticky', className: 'show' } });
    if (reduceMotion) return;

    // Abertura: foto em arco, celular, aviso de pedido e selo.
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.pitch-arch', { y: 40, opacity: 0, duration: 1.1 })
      .from('.pitch-arch img', { scale: 1.25, duration: 1.8 }, '<')
      .from('.pitch-phone', { y: 140, rotate: 5, opacity: 0, duration: 1.1 }, '-=1.4')
      .from('.pitch-phone-grid > div', { y: 18, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.5')
      .from('.pitch-hero-copy .fade-in', { y: 24, opacity: 0, stagger: 0.12, duration: 0.8 }, 0.5)
      .from('.pitch-notify', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2.2)' }, '-=0.2')
      .from('.pitch-sticker', { scale: 0, rotate: -160, duration: 0.9, ease: 'back.out(1.6)' }, '-=0.3');
    // Profundidade ao rolar.
    gsap.to('.pitch-phone', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.pitch-hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.pitch-arch img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.pitch-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Como funciona: cada telinha encena o seu passo quando aparece.
    gsap.timeline({ scrollTrigger: { trigger: '.pitch-step-1', start: 'top 72%' } })
      .from('.pitch-step-1 .mock-service', { x: -18, opacity: 0, stagger: 0.12, duration: 0.45 })
      .to('.pitch-step-1 .mock-picked', { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.2');
    gsap.timeline({ scrollTrigger: { trigger: '.pitch-step-2', start: 'top 72%' } })
      .from('.pitch-step-2 .mock-days > span', { y: 10, opacity: 0, stagger: 0.07, duration: 0.35 })
      .from('.pitch-step-2 .mock-hours > span', { scale: 0.6, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'back.out(2)' })
      .from('.pitch-step-2 .mock-hour-pick', { backgroundColor: 'rgba(0,0,0,0)', color: 'inherit', duration: 0.3 }, '+=0.15')
      .to('.pitch-step-2 .mock-confirm', { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 });
    gsap.timeline({ scrollTrigger: { trigger: '.pitch-step-3', start: 'top 72%' } })
      .from('.pitch-step-3 .mock-agenda:not(.mock-new-row)', { opacity: 0, y: 8, stagger: 0.1, duration: 0.35 })
      .from('.pitch-step-3 .mock-new-row', { opacity: 0, x: 30, duration: 0.55, ease: 'back.out(1.6)' }, '+=0.2')
      .from('.pitch-step-3 .mock-status', { scale: 0, duration: 0.35, ease: 'back.out(2.5)' });

    // Preço: o valor cai de R$ 1.200 até o preço da oferta.
    const value = root.current?.querySelector<HTMLElement>('.pitch-price-value');
    if (offer?.promoValue && value) {
      const counter = { n: offer.priceValue };
      gsap.timeline({ scrollTrigger: { trigger: '.pitch-price-card', start: 'top 75%' } })
        .from('.pitch-price s', { opacity: 0, x: -12, duration: 0.4 })
        .to(counter, { n: offer.promoValue, duration: 1.4, ease: 'power3.out', onUpdate: () => { value.textContent = brl(Math.round(counter.n)); } })
        .from('.pitch-price-badge', { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');
    }
  }, { scope: root });

  return <div className="pitch" ref={root}>
    {offer?.promo && <button type="button" className="pitch-offer-bar" onClick={() => scrollToSection('preco')}>
      <span className="pitch-offer-tag"><ShinyText color="#121012" shineColor="#FFFFFF" speed={2.5} disabled={reduceMotion}>{offer.label}</ShinyText></span>
      <span>Seu site de <s>{offer.price}</s> por <strong>{offer.promo}</strong></span>
      {offer.note && <span className="pitch-offer-note">{offer.note}</span>}
      <ArrowRight size={14} aria-hidden="true" />
    </button>}

    <header className="pitch-header wrap">
      <a href="#/" className="pitch-logo"><Flower2 size={20} strokeWidth={1.6} /><span>{pitch.productName}</span></a>
      <nav className="pitch-nav" aria-label="Seções">
        <button type="button" onClick={() => scrollToSection('como-funciona')}>Como funciona</button>
        <button type="button" onClick={() => scrollToSection('experimente')}>Experimente</button>
        <button type="button" onClick={() => scrollToSection('preco')}>Preço</button>
      </nav>
      <a href={`#${STORE}`} className="button pitch-header-cta"><Store size={16} /><span className="pitch-header-cta-long">Ver site de apresentação</span><span className="pitch-header-cta-short">Ver site</span></a>
    </header>

    <main id="main">
      <section className="pitch-hero wrap">
        <div className="pitch-hero-copy">
          <span className="eyebrow fade-in"><span className="gold-line" /> SITE PARA SALÕES DE BELEZA</span>
          <h1><Words text="Seu salão com" /> <em><Words text="agenda online." delay={180} /></em></h1>
          <p className="fade-in">Suas clientes marcam corte, escova e unhas sozinhas, a qualquer hora, só nos horários livres. Você acompanha tudo num calendário no celular.</p>
          <div className="pitch-actions fade-in">
            <a href={`#${STORE}`} className="button">Ver site de apresentação <ArrowUpRight size={18} /></a>
            <a href="#/admin" className="button button-outline"><LayoutDashboard size={17} />Abrir a agenda</a>
          </div>
        </div>
        <div className="pitch-hero-visual" aria-hidden="true">
          <div className="pitch-arch"><img src="/images/pitch-1.jpg" alt="" /></div>
          {offer?.promo && <div className="pitch-sticker"><small>{offer.label}</small><strong><ShinyText color="#E2C46F" shineColor="#FFF6D6" speed={3} disabled={reduceMotion}>{`${offer.off}%`}</ShinyText></strong><small>OFF</small></div>}
          <div className="pitch-notify"><span className="pitch-notify-icon"><CalendarDays size={15} /></span><div><strong>Novo agendamento</strong><small>{PET.nome} · {PET.servico} · {PET.hora}</small></div></div>
          <div className="pitch-phone">
            <div className="pitch-phone-bar"><span>STUDIO ÍRIS</span><Flower2 size={11} /></div>
            <div className="pitch-phone-slots">
              <small>Hoje · quinta</small>
              <div>{['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((h, i) => <span key={h} className={i === 1 ? 'picked' : i === 0 || i === 4 ? 'taken' : ''}>{h}</span>)}</div>
              <div className="pitch-phone-service"><Wind size={11} /><span><b>{PET.servico}</b><small>com {PET.prof} · 1h30</small></span></div>
            </div>
            <div className="pitch-phone-cta"><Check size={11} />Confirmar agendamento</div>
          </div>
        </div>
      </section>

      <div className="pitch-marquee" aria-hidden="true">
        <LogoLoop logos={marquee} speed={40} gap={14} logoHeight={150} fadeOut fadeOutColor="var(--ivory)" ariaLabel="Trabalhos do salão"
          renderItem={(item, key) => <div key={key} className="pitch-marquee-item"><img src={'src' in item ? item.src : ''} alt="" loading="lazy" /></div>} />
      </div>

      <section className="pitch-section wrap" id="como-funciona">
        <Reveal className="pitch-heading center"><span className="eyebrow">COMO FUNCIONA</span><h2>Três passos. <em>Nada complicado.</em></h2></Reveal>
        <Reveal className="pitch-how" stagger={0.15}>{howItWorks.map((step, i) => <div key={step.title} className={`pitch-how-step pitch-step-${i + 1}`}>
          <div className="pitch-how-stage">{step.mock}</div>
          <div className="pitch-how-text"><span>{i + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>
          {i < howItWorks.length - 1 && <ArrowRight className="pitch-how-arrow" size={20} aria-hidden="true" />}
        </div>)}</Reveal>
      </section>

      <section className="pitch-section wrap">
        <Reveal className="pitch-heading center"><span className="eyebrow">TUDO INCLUSO</span><h2>O que o seu salão <em>ganha.</em></h2></Reveal>
        <Reveal className="pitch-included" stagger={0.06} distance={24}>{included.map(({ icon: Icon, label }) => <div key={label}><Icon size={20} strokeWidth={1.5} />{label}</div>)}</Reveal>
      </section>

      <section className="pitch-try" id="experimente">
        <div className="wrap">
          <Reveal className="pitch-heading center"><span className="eyebrow">EXPERIMENTE</span><h2>Veja por dentro, <em>sem compromisso.</em></h2><p>Salão fictício: agende e mexa à vontade.</p></Reveal>
          <Reveal className="pitch-try-grid" stagger={0.15}>
            <a href={`#${STORE}`} className="pitch-try-card"><span className="pitch-try-photo"><img src="/images/pitch-2.jpg" alt="" /></span><div><span className="eyebrow">COMO CLIENTE</span><h3>Ver site de apresentação</h3><span className="pitch-link">Fazer um agendamento <ArrowUpRight size={16} /></span></div></a>
            <a href="#/admin" className="pitch-try-card"><span className="pitch-try-photo"><img src="/images/login.jpg" alt="" /></span><div><span className="eyebrow">COMO SALÃO</span><h3>Abrir a agenda</h3><span className="pitch-link">Ver o calendário <ArrowUpRight size={16} /></span></div></a>
          </Reveal>
          <Reveal className="pitch-palettes"><span><Palette size={16} />Troque as cores do site:</span><ThemePicker /></Reveal>
        </div>
      </section>

      <section className="pitch-section wrap" id="preco">
        <Reveal className="pitch-heading center"><span className="eyebrow">INVESTIMENTO</span><h2>Quanto <em>custa.</em></h2></Reveal>
        <div className="pitch-pricing">
          {offer && <Reveal className="pitch-price-wrap" distance={48}><article className="pitch-price-card">
            {offer.promo && <span className="pitch-price-badge">{offer.label} · {offer.off}% OFF</span>}
            <h3>Criação do seu site</h3>
            <p className="pitch-price">{offer.promo && <s>{offer.price}</s>}<strong><ShinyText color="#F4EEE2" shineColor="#E2C46F" speed={3.5} disabled={reduceMotion}><span className="pitch-price-value">{offer.promo ?? offer.price}</span></ShinyText></strong></p>
            <p className="pitch-price-note">Pagamento único{offer.promo && offer.note ? ` · ${offer.note}` : ''}</p>
            <ul>{siteIncludes.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul>
            {contactHref && <StarBorder as="a" href={contactHref} target="_blank" rel="noopener noreferrer" className="pitch-price-cta" color="#FFF6D6" backgroundColor="#E2C46F" textColor="#121012" borderColor="rgba(255, 246, 214, .55)" radius={6} duration={4}><ContactIcon size={18} />{ctaLabel}</StarBorder>}
          </article></Reveal>}
          <Reveal className="pitch-pricing-side" stagger={0.15} delay={0.1}>
            <div className="pitch-mini">
              <span className="pitch-mini-title"><Cloud size={16} />Para manter no ar</span>
              <ul className="pitch-mini-plans">{plans.map(plan => <li key={plan.name}><div><strong>{plan.name}</strong><small>{plan.text}</small></div><span>{plan.price}{plan.unit && <small>{plan.unit}</small>}</span></li>)}</ul>
              <p>Você escolhe. Nos dois, o site e os dados ficam no nome da sua loja.</p>
            </div>
            <div className="pitch-mini">
              <span className="pitch-mini-title"><Wrench size={16} />Depois da entrega</span>
              <ul className="pitch-mini-rules">
                <li><Check size={15} />Serviços, preços e horários você muda à vontade, sem custo.</li>
                <li><Plus size={15} />Qualquer alteração no site ou nova funcionalidade tem um custo à parte, combinado antes.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pitch-section wrap pitch-faq-section">
        <Reveal className="pitch-heading center"><span className="eyebrow">DÚVIDAS</span><h2>Perguntas <em>rápidas.</em></h2></Reveal>
        <Reveal className="pitch-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</Reveal>
      </section>

      <section className="pitch-final">
        <div className="wrap">
          <Reveal distance={28}><h2>Vamos abrir a sua <em>agenda online?</em></h2></Reveal>
          <Reveal delay={0.15}>
            {offer?.promo && <p className="pitch-final-offer">{offer.label}: de <s>{offer.price}</s> por <strong>{offer.promo}</strong>{offer.note && <> · {offer.note.toLocaleLowerCase('pt-BR')}</>}</p>}
            <ol className="pitch-onboarding">{onboarding.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}</ol>
            <div className="pitch-actions">
              {contactHref && <a href={contactHref} target="_blank" rel="noopener noreferrer" className="button pitch-final-cta"><ContactIcon size={18} />{ctaLabel}</a>}
              <a href={`#${STORE}`} className="button button-outline pitch-final-secondary">Ver site de apresentação <ArrowUpRight size={17} /></a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
    <footer className="pitch-footer wrap"><span>© {new Date().getFullYear()} {pitch.productName}</span><a className="octype-credit" href="https://octype.studio/" target="_blank" rel="noopener noreferrer" aria-label="Design por Octype, abre octype.studio"><span>Design por</span><img src="/octype/simbolo.svg" alt="" width="30" height="18" /><img src="/octype/wordmark.svg" alt="Octype" width="56" height="11" /></a></footer>

    {/* Celular: preço e botão sempre à mão depois da abertura */}
    <div className="pitch-sticky" role="region" aria-label="Oferta">
      <div className="pitch-sticky-price">{offer?.promo ? <><small><s>{offer.price}</s> · {offer.label}</small><strong>{offer.promo}</strong></> : offer ? <strong>{offer.price}</strong> : <strong>{pitch.productName}</strong>}</div>
      {contactHref ? <a href={contactHref} target="_blank" rel="noopener noreferrer" className="button pitch-sticky-cta"><ContactIcon size={17} />{ctaLabel}</a> : <a href={`#${STORE}`} className="button pitch-sticky-cta">Ver loja</a>}
    </div>
  </div>;
}
