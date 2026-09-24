import * as React from "react";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { Input, type InputProps } from "./field";

/**
 * Campo de dinheiro em pt-BR: mostra "1.800,00" e aceita "1800", "1.800,5"
 * ou "1800.50" ao digitar. O valor exposto é sempre um número (ou null).
 */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, "value" | "onChange" | "type" | "leading"> & {
    value: number | null | undefined;
    onValueChange: (value: number | null) => void;
  }
>(function CurrencyInput({ value, onValueChange, onBlur, onFocus, placeholder = "0,00", ...props }, ref) {
  const [text, setText] = React.useState(() => (value === null || value === undefined ? "" : formatCurrencyInput(value)));
  const editing = React.useRef(false);

  // Acompanha o valor externo enquanto o campo não está sendo editado.
  React.useEffect(() => {
    if (!editing.current) setText(value === null || value === undefined ? "" : formatCurrencyInput(value));
  }, [value]);

  return (
    <Input
      ref={ref}
      inputMode="decimal"
      leading={<span className="text-sm">R$</span>}
      placeholder={placeholder}
      value={text}
      onFocus={(event) => { editing.current = true; onFocus?.(event); }}
      onChange={(event) => {
        setText(event.target.value);
        onValueChange(parseCurrencyInput(event.target.value));
      }}
      onBlur={(event) => {
        editing.current = false;
        const parsed = parseCurrencyInput(text);
        setText(parsed === null ? "" : formatCurrencyInput(parsed));
        onBlur?.(event);
      }}
      className="tabular-nums"
      {...props}
    />
  );
});
