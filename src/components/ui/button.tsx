import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--dur-fast)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy-700 text-white hover:bg-navy-600 active:bg-navy-800",
  secondary:
    "border border-gold-400 text-navy-700 bg-transparent hover:bg-gold-50",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100",
  outline: "border border-ink-300 text-ink-700 bg-transparent hover:bg-ink-100",
  danger: "bg-danger-500 text-white hover:bg-danger-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      BASE,
      VARIANTS[variant],
      SIZES[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
