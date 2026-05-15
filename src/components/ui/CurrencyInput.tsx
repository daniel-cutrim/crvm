import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  cents: number;
  onCentsChange: (cents: number) => void;
  className?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function CurrencyInput({ cents, onCentsChange, className, autoFocus, onBlur, onKeyDown, disabled }: Props) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      onCentsChange(Math.floor(cents / 10));
    } else if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const next = cents * 10 + parseInt(e.key);
      if (next <= 9999999999) onCentsChange(next);
    }
    onKeyDown?.(e);
  }, [cents, onCentsChange, onKeyDown]);

  const display = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={cn(
      'flex items-center border border-input rounded-md bg-background h-10',
      'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 transition-shadow',
      disabled && 'opacity-50 cursor-not-allowed',
      className,
    )}>
      <span className="pl-3 pr-1 text-sm text-muted-foreground shrink-0 select-none">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        autoFocus={autoFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="flex-1 bg-transparent pr-3 py-2 text-sm outline-none min-w-0"
      />
    </div>
  );
}
