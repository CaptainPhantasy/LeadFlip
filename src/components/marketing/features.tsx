import { Brain, Phone, Target, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Brain,
    title: "AI Lead Classification",
    description: "Claude Agent SDK analyzes consumer problems and extracts service type, urgency, budget, and location automatically.",
  },
  {
    icon: Target,
    title: "Smart Matching",
    description: "Matches based on proximity, ratings, historical response rates, and pricing alignment—not just keywords.",
  },
  {
    icon: Phone,
    title: "Autonomous Calling",
    description: "AI makes outbound calls to qualify leads on your behalf using OpenAI Realtime API + Claude reasoning.",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get SMS/email/Slack alerts the moment a high-quality lead matches your business profile.",
  },
]

export function Features() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            How LeadFlip Works
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Multi-agent AI orchestration for smarter lead generation
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
