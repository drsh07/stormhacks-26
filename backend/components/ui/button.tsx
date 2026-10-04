import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui button, restyled: ink outline + hard shadow that presses in on click.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-ink font-display font-bold transition-[transform,box-shadow] disabled:pointer-events-none disabled:opacity-50 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        quest: "bg-quest text-ink",
        secondary: "bg-paper text-ink",
        destructive: "bg-coral text-white",
        ghost: "border-transparent shadow-none active:translate-x-0 active:translate-y-0 hover:bg-muted",
      },
      size: {
        default: "h-11 px-5 text-base",
        sm: "h-9 px-3 text-sm",
        lg: "h-14 px-7 text-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
