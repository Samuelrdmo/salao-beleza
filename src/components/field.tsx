import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Rótulo + campo shadcn/ui + dica, no padrão do site. */
export function Field({ id, label, hint, optional, className, children }: { id: string; label: ReactNode; hint?: ReactNode; optional?: boolean; className?: string; children: ReactNode }) {
  return <div className={cn('field', className)}>
    <Label htmlFor={id} className="text-[13px] font-bold">{label}{optional && <span className="optional"> (opcional)</span>}</Label>
    {children}
    {hint && <small className="field-hint">{hint}</small>}
  </div>;
}
