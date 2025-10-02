import { Navigation } from "@/components/navigation"
import { cn } from "@/lib/utils"

interface SiteShellProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full"
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
}

export function SiteShell({ children, className, maxWidth = "7xl" }: SiteShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className={cn("flex-1 container mx-auto px-4 py-8", maxWidthMap[maxWidth], className)}>
        {children}
      </main>
      <footer className="border-t border-border py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 LeadFlip. Powered by Claude Agent SDK.
        </div>
      </footer>
    </div>
  )
}
