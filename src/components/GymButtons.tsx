import React from "react";
import { Loader2 } from "lucide-react";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  loading,
  children,
  className = "",
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={`
      w-full flex items-center justify-center gap-2
      bg-foreground text-background
      font-semibold text-[15px] tracking-tight
      px-5 py-4 rounded-2xl shadow-button
      transition-all duration-150 active-scale hover:opacity-90
      disabled:opacity-40 disabled:pointer-events-none
      ${className}
    `}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`
      inline-flex items-center justify-center gap-1.5
      bg-transparent text-foreground/70 border border-border
      font-medium text-sm
      px-3 py-2 rounded-xl
      hover:bg-secondary hover:text-foreground
      transition-all duration-150 active-scale
      disabled:opacity-40 disabled:pointer-events-none
      ${className}
    `}
  >
    {children}
  </button>
);
