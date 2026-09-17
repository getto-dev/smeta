import React from 'react';

const BUTTON_BASE = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_VARIANTS = {
  primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/10',
  secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
  outline: 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700',
  danger: 'bg-slate-800/90 text-red-300 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50',
  ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'secondary', className = '', type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
));
Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { size?: 'sm' | 'md'; }
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ size = 'md', className = '', type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={`${size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl'} inline-flex items-center justify-center bg-slate-800/90 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
));
IconButton.displayName = 'IconButton';

export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`rounded-2xl border border-slate-800 bg-slate-900 shadow-xl ${className}`} {...props} />
);

export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', ...props }) => (
  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300 ${className}`} {...props} />
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />
));
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={`w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />
));
TextArea.displayName = 'TextArea';
