import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-ctl bg-fill px-3.5 text-body text-ink outline-none transition-shadow placeholder:text-ink-3 focus:ring-2 focus:ring-tint/45 disabled:text-ink-3';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, 'h-11', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[88px] resize-none py-2.5 leading-snug', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'tabular h-11 appearance-none pr-8', className)} {...props} />
));
Select.displayName = 'Select';

/** A small label above a field. */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('label-case mb-1.5 block px-1 text-sub font-medium text-ink-2', className)} {...props} />;
}
