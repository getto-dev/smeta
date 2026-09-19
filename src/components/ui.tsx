import React, { useEffect, useRef, useState } from 'react';

const BUTTON_BASE = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:min-h-0 sm:text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_VARIANTS = {
  primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/10',
  secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
  outline: 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700',
  danger: 'bg-slate-800/90 text-red-300 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50',
  ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', className = '', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
  ),
);
Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${size === 'sm' ? 'min-h-11 min-w-11 rounded-xl sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 sm:rounded-lg' : 'min-h-11 min-w-11 rounded-xl'} inline-flex items-center justify-center bg-slate-800/90 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';

export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={`rounded-2xl border border-slate-800 bg-slate-900 shadow-xl ${className}`} {...props} />
);

export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', ...props }) => (
  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300 ${className}`} {...props} />
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  ),
);
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  ),
);
TextArea.displayName = 'TextArea';

interface EditableNumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  formatValue?: (value: number) => string;
  parseValue?: (draft: string) => number;
  validate?: (value: number, draft: string) => string | null;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>['enterKeyHint'];
  ariaLabel: string;
  title?: string;
  className?: string;
  min?: number;
  max?: number;
  onCommitted?: () => void;
}

export const EditableNumberInput = React.forwardRef<HTMLInputElement, EditableNumberInputProps>(
  (
    {
      value,
      onCommit,
      formatValue = (next) => String(next),
      parseValue = (draft) => Number(draft.replace(',', '.')),
      validate,
      inputMode = 'decimal',
      enterKeyHint = 'done',
      ariaLabel,
      title,
      className = '',
      min,
      max,
      onCommitted,
    },
    forwardedRef,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [draft, setDraft] = useState(formatValue(value));
    const [error, setError] = useState<string | null>(null);
    const focusedRef = useRef(false);

    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    useEffect(() => {
      if (!focusedRef.current) {
        setDraft(formatValue(value));
        setError(null);
      }
    }, [value, formatValue]);

    const commit = () => {
      const parsed = parseValue(draft.trim());
      const numeric = Number.isFinite(parsed) ? parsed : NaN;
      const rangeMessage = Number.isFinite(numeric)
        ? ((min !== undefined && numeric < min) ? `Минимум: ${formatValue(min)}` : (max !== undefined && numeric > max) ? `Максимум: ${formatValue(max)}` : null)
        : 'Введите число';
      const validationMessage = rangeMessage || validate?.(numeric, draft) || null;

      if (!Number.isFinite(numeric) || validationMessage) {
        setError(validationMessage || 'Введите корректное число');
        return false;
      }

      setError(null);
      focusedRef.current = false;
      onCommit(numeric);
      setDraft(formatValue(numeric));
      onCommitted?.();
      return true;
    };

    const revert = () => {
      focusedRef.current = false;
      setDraft(formatValue(value));
      setError(null);
    };

    return (
      <div className="relative min-w-0">
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          value={draft}
          onFocus={(e) => {
            focusedRef.current = true;
            setError(null);
            requestAnimationFrame(() => e.currentTarget.select());
          }}
          onChange={(e) => {
            focusedRef.current = true;
            setError(null);
            setDraft(e.target.value);
          }}
          onBlur={() => {
            if (!commit()) {
              focusedRef.current = false;
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (commit()) e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              revert();
              e.currentTarget.blur();
            }
          }}
          className={`min-h-11 rounded-xl bg-slate-950 border px-3 text-base text-white font-mono focus:outline-none sm:min-h-0 sm:text-sm ${error ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-700 focus:border-amber-500'} ${className}`}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          title={title}
        />
        {error && (
          <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-red-500/30 bg-slate-950 px-2 py-1 text-[10px] leading-tight text-red-300 shadow-lg">
            {error}
          </div>
        )}
      </div>
    );
  },
);
EditableNumberInput.displayName = 'EditableNumberInput';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  mobileSheet?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  labelledBy,
  describedBy,
  mobileSheet = true,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !rootRef.current) return;
      const focusables = Array.from(
        rootRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${mobileSheet ? 'items-end sm:items-center' : 'items-center'} justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm overscroll-contain`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchEnd={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        className={`w-full rounded-t-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[100dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:rounded-2xl sm:max-h-[90vh] sm:pb-0 ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
