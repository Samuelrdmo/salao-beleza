// Cria clients/<slug>/ a partir do salão de apresentação.
// Uso: npm run novo-cliente -- <slug> "Nome do Salão"
import fs from 'node:fs';
import path from 'node:path';

const [slug, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(' ').trim();
if (!slug || !/^[a-z0-9-]+$/.test(slug) || !fullName) {
  console.error('Uso: npm run novo-cliente -- <slug-em-minusculas> "Nome do Salão"');
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'clients', 'demo');
const target = path.join(root, 'clients', slug);
if (fs.existsSync(target)) { console.error(`clients/${slug} já existe.`); process.exit(1); }

fs.cpSync(source, target, { recursive: true, filter: file => !path.basename(file).startsWith('pitch-') });
const client = JSON.parse(fs.readFileSync(path.join(source, 'client.json'), 'utf8'));
const name = fullName.split(/\s+/)[0].toUpperCase();
client.slug = slug;
client.presentation = false;
delete client.pitch;
client.brand = { ...client.brand, name, fullName, logo: '', logoAlt: fullName, logoWidth: 0, logoHeight: 0 };
client.contact = { whatsapp: '', instagram: '', endereco: '' };
client.sheetsApiUrl = '';
client.seo = { ...client.seo, title: `${fullName} — Agende seu horário online`, description: `${fullName}. Agende corte, escova, cor e unhas online, só nos horários livres.` };
for (const key of Object.keys(client.texts)) client.texts[key] = client.texts[key].replaceAll('Studio Íris', fullName).replaceAll('Íris', fullName);
fs.writeFileSync(path.join(target, 'client.json'), JSON.stringify(client, null, 2) + '\n');

// A marca fictícia da apresentação (Pelúcia) nunca vai para um cliente: o favicon começa neutro.
fs.writeFileSync(path.join(target, 'public', 'favicon.svg'), '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="14" fill="#F7F4EB"/></svg>\n');

// Tokens sem as paletas extras da apresentação.
const tokens = fs.readFileSync(path.join(source, 'tokens.css'), 'utf8');
const base = tokens.slice(tokens.indexOf(':root'), tokens.indexOf('[data-theme="ceu"]')).replace(':root, [data-theme="coral"]', ':root');
fs.writeFileSync(path.join(target, 'tokens.css'), `/* ${fullName} — tokens do design system. Troque pelos valores da marca (ver DESIGN_SYSTEM.md). */\n${base.trim()}\n`);

console.log(`Pronto: clients/${slug}/
Próximos passos:
  1. Ajuste clients/${slug}/tokens.css e client.json com o design system da marca.
  2. Coloque a logo (opcional) em clients/${slug}/public/brand/ e o favicon em public/favicon.svg.
  3. Veja o site:  npm run dev -- --mode ${slug}
  4. Conecte a planilha (google-sheets/INSTALACAO.md) e publique:  npm run publicar -- ${slug}`);
