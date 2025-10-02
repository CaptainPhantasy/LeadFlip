import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Powered by Claude Agent SDK
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            AI-Powered Leads,{" "}
            <span className="text-primary">Delivered to Your Phone</span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            Consumers post problems. Our AI matches them with local businesses and
            makes autonomous calls to qualify leads. No bidding wars, no spam.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="group">
              <Link href="/consumer">
                Post Your Problem
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/for-businesses">For Businesses</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Gradient blur background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-3xl" />
    </section>
  )
}
