import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[rgba(17,43,134,0.1)] bg-white px-3 py-2.5 text-[15px] shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#69707d] focus:outline-none focus:border-[#0077cc] focus:ring-[3px] focus:ring-[rgba(0,119,204,0.08)] disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
