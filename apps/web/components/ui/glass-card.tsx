import { cn } from "@/lib/cn";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  tint?: "none" | "blush" | "sage" | "peri";
  interactive?: boolean;
};

const tints = {
  none: "",
  blush: "glass-card-blush",
  sage: "glass-card-sage",
  peri: "glass-card-peri",
};

export function GlassCard({
  tint = "none",
  interactive = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-3xl",
        tints[tint],
        interactive && "glass-card-interactive cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
