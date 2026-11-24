// Gera o site de um cliente e publica no Cloudflare Pages da conta logada no Wrangler.
// Uso: npm run publicar -- <slug>
// Antes, na primeira vez com cada cliente:  npx wrangler logout  e  npx wrangler login  (com a conta Cloudflare da lojista).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const slug = process.argv[2];
const root = path.resolve(import.meta.dirname, '..');
if (!slug || !fs.existsSync(path.join(root, 'clients', slug, 'client.json'))) {
  console.error('Uso: npm run publicar -- <slug>   (o cliente precisa existir em clients/<slug>)');
  process.exit(1);
}
const client = JSON.parse(fs.readFileSync(path.join(root, 'clients', slug, 'client.json'), 'utf8'));
if (!client.presentation && !client.sheetsApiUrl) console.warn('Aviso: sheetsApiUrl está vazio. O site vai abrir em modo demonstrativo, sem planilha.');
const project = client.cloudflareProject || (slug === 'demo' ? 'agenda-salao-apresentacao' : slug);
const run = command => { console.log(`\n> ${command}`); execSync(command, { stdio: 'inherit', cwd: root }); };

run('npx tsc -b');
run(`npx vite build --mode ${slug === 'demo' ? 'production' : slug}`);
run(`npx wrangler pages deploy dist --project-name ${project} --branch main --commit-dirty=true`);
console.log(`\nPublicado. Endereço: https://${project}.pages.dev`);
