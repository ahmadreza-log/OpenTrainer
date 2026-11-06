import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:ring-acid/50 inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-acid hover:bg-acid-bright text-ink h-10 px-5",
        secondary: "bg-raised hover:bg-line text-text h-10 px-4",
        ghost: "text-mute hover:text-text h-9 px-3",
        danger: "text-danger hover:bg-danger/10 h-9 px-3",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
