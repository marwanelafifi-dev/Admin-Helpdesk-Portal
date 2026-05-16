import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "interactive-lift inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_12px_24px_-14px_hsl(var(--primary)/0.95)] hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_12px_24px_-14px_hsl(var(--destructive)/0.9)] hover:bg-destructive/90",
        outline: "border border-input bg-background/95 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.2)] hover:bg-secondary/80",
        ghost: "shadow-none hover:bg-accent hover:text-accent-foreground hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(
        buttonVariants({ variant, size, className }),
        "duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
      )} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
