import { useId } from "react";
import { labelText, textField } from "@/components/react/styles";

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
}

/** A labeled, accessible numeric text input (kept as text so an empty or
 *  partially-typed value doesn't silently become 0 before Calculate runs). */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: NumberFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelText}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={textField}
      />
    </div>
  );
}
