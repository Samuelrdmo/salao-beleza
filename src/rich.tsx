import { Fragment } from 'react';
import type { ReactNode } from 'react';

/** Texto do client.json: "|" quebra a linha e *trecho* vira itálico. */
export function rich(text: string): ReactNode {
  return text.split('|').map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line.split(/(\*[^*]+\*)/g).map((part, j) => part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em> : part)}</Fragment>);
}
