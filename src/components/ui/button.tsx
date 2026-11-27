import { forwardRef, type ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Adapted from the shadcn/ui Radix Button to use Theab’s original variants and sizes.
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,border,filter,transform] active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-black shadow-[0_1px_0_rgba(255,255,255,.12)_inset]",
        gold: "bg-gold text-white hover:bg-gold-2",
        outline: "border border-input bg-card text-card-foreground hover:border-foreground/40",
        ghost: "text-ink-2 hover:bg-black/[.04]",
        danger: "bg-danger text-white hover:brightness-95",
        soft: "bg-secondary text-secondary-foreground hover:brightness-[.97]",
      },
      size: { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Options = VariantProps<typeof buttonVariants>;

export function buttonClass(variant?: NonNullable<Options["variant"]>, size?: NonNullable<Options["size"]>, className?: string) {
  return cn(buttonVariants({ variant, size }), className);
}

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & Options & { asChild?: boolean }>(
  function Button({ variant = "primary", size = "md", className, asChild, ...props }, ref) {
    const Element = asChild ? Slot : "button";
    return <Element ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
