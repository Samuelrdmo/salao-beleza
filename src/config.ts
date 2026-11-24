import raw from '@client/client.json';

/** Formato de clients/<slug>/client.json. Ver DESIGN_SYSTEM.md. */
export type ClientConfig = {
  slug: string;
  /** true = site de apresentação do produto (página de venda + salão fictício + painel aberto). */
  presentation: boolean;
  brand: { name: string; fullName: string; signature: string; logo: string; logoAlt: string; logoWidth: number; logoHeight: number };
  /** Contatos iniciais. Com a planilha conectada, valem os da aba Config. */
  contact: { whatsapp: string; instagram: string; endereco: string };
  /** URL do Apps Script publicado na planilha da cliente. Vazio = dados de demonstração no navegador. */
  sheetsApiUrl: string;
  seo: { title: string; description: string; themeColor: string; fontsUrl: string };
  images: { hero: string; login: string };
  texts: Record<TextKey, string>;
  /** Página de venda. Preços em reais. Sem promoPrice, mostra só o preço normal; sem price, esconde o preço. */
  pitch?: { productName: string; whatsapp: string; instagram: string; price?: number; promoPrice?: number | null; promoLabel?: string; promoNote?: string };
};
export type TextKey = 'topline' | 'heroEyebrow' | 'heroTitle' | 'heroText' | 'heroCta' | 'heroBottom' | 'heroCaptionTitle' | 'heroCaptionText' | 'heroStamp' | 'servicesEyebrow' | 'servicesTitle' | 'footerTagline' | 'footerNote' | 'loginTitle' | 'loginImageText';

export const client = raw as ClientConfig;
export const brand = client.brand;
export const texts = client.texts;
export const presentation = client.presentation === true;
export const sheetsUrl = client.sheetsApiUrl.trim();
/** Sem planilha conectada: agenda e painel funcionam com dados salvos no navegador. */
export const demoMode = !sheetsUrl;
/** Página inicial do salão. Na apresentação, "/" é a página de venda e o site fica em /loja. */
export const STORE = presentation ? '/loja' : '/';
