import { SelectHTMLAttributes, forwardRef } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, fullWidth = false, id, className = "", ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: fullWidth ? "100%" : undefined }}>
        {label && (
          <label
            htmlFor={selectId}
            style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={className}
          style={{
            height: 40,
            padding: "0 32px 0 12px",
            border: `1px solid ${error ? "var(--danger-500)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            color: props.value ? "var(--fg-primary)" : "var(--fg-tertiary)",
            fontFamily: "var(--font-sans)",
            fontSize: 14.5,
            outline: "none",
            width: fullWidth ? "100%" : undefined,
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2376736A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }}
          onBlur={(e) => { e.target.style.borderColor = error ? "var(--danger-500)" : "var(--border-default)"; e.target.style.boxShadow = "none"; }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span style={{ fontSize: 12.5, color: "var(--danger-500)", fontFamily: "var(--font-sans)" }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
