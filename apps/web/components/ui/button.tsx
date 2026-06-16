import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-linear-to-b from-zinc-800 to-black text-white shadow-xl shadow-zinc-900/20 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
  secondary:
    "border border-line bg-card text-ink hover:bg-canvas motion-safe:active:scale-[0.98]",
  ghost: "text-muted hover:bg-line/60 hover:text-ink",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
