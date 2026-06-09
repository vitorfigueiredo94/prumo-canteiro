import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, fullWidth = false, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: fullWidth ? "100%" : undefined }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--fg-secondary)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={className}
          style={{
            height: 40,
            padding: "0 12px",
            border: `1px solid ${error ? "var(--danger-500)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            color: "var(--fg-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: 14.5,
            outline: "none",
            transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
            width: fullWidth ? "100%" : undefined,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)";
            e.currentTarget.style.boxShadow = "var(--shadow-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--danger-500)" : "var(--border-default)";
            e.currentTarget.style.boxShadow = "none";
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: 12.5, color: "var(--danger-500)", fontFamily: "var(--font-sans)" }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 12.5, color: "var(--fg-tertiary)", fontFamily: "var(--font-sans)" }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
