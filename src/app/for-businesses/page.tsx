import Link from "next/link"
import { Phone, Target, TrendingUp, Shield, DollarSign, Clock } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const benefits = [
  {
    icon: Target,
    title: "Qualified Leads Only",
    description: "Our AI pre-qualifies every lead before you see it. No tire-kickers, no spam—just customers ready to buy.",
  },
  {
    icon: Phone,
    title: "AI Calls on Your Behalf",
    description: "Let our AI agent make outbound calls to confirm details, check availability, and schedule appointments automatically.",
  },
  {
    icon: TrendingUp,
    title: "Higher Conversion Rates",
    description: "Businesses on LeadFlip see 85% average conversion rates because leads are matched based on your specific expertise and capacity.",
  },
  {
    icon: Clock,
    title: "Instant Notifications",
    description: "Get SMS, email, or Slack alerts the moment a high-quality lead matches your profile. Respond faster than your competition.",
  },
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description: "No bidding wars or lead fees. Pay a simple monthly subscription with included AI calls. Cancel anytime.",
  },
  {
    icon: Shield,
    title: "Protected Territory",
    description: "We limit the number of businesses per service category in your area to ensure you're not competing with 20 others for the same lead.",
  },
]

const howItWorks = [
  {
    step: "1",
    title: "Create Your Business Profile",
    description: "Tell us about your services, service area, pricing, and capacity. Takes less than 5 minutes.",
  },
  {
    step: "2",
    title: "AI Matches You with Leads",
    description: "Our Business Matcher agent analyzes consumer problems and scores compatibility based on location, expertise, ratings, and availability.",
  },
  {
    step: "3",
    title: "Review & Respond to Leads",
    description: "See matched leads in your dashboard with quality scores, consumer details, and urgency level. Accept or decline with one click.",
  },
  {
    step: "4",
    title: "AI Calls to Qualify (Optional)",
    description: "Request our AI to call the consumer on your behalf to confirm details, verify budget, and schedule appointments.",
  },
  {
    step: "5",
    title: "Close the Deal",
    description: "Show up prepared with all the information you need. No surprises, no wasted trips.",
  },
]

const testimonials = [
  {
    quote: "I used to spend $500/month on other lead gen services and got mostly junk. LeadFlip gives me 3-5 qualified plumbing leads per week for $149. The AI calls are a game-changer.",
    author: "Sarah Johnson",
    business: "ABC Plumbing",
    location: "Carmel, IN",
  },
  {
    quote: "The AI pre-qualification saves me hours every week. I only see leads that actually match my services and budget requirements.",
    author: "Mike Chen",
    business: "Chen's Lawn Care",
    location: "Fishers, IN",
  },
  {
    quote: "Started with the free tier to test it out. Got my first paid job within 3 days. Upgraded to Professional immediately.",
    author: "David Rodriguez",
    business: "Rodriguez HVAC",
    location: "Noblesville, IN",
  },
]

export default function ForBusinessesPage() {
  return (
    <SiteShell>
      <div className="space-y-20">
        {/* Hero Section */}
        <div className="text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
            <Phone className="mr-2 h-4 w-4 text-primary" />
            For Service Businesses
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Stop Chasing Leads.{" "}
            <span className="text-primary">Let AI Bring Them to You.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Join local service businesses using LeadFlip to get qualified leads without
            bidding wars, spam, or wasted time.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/sign-up">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>

        {/* Benefits Section */}
        <div>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Why Businesses Choose LeadFlip
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Built specifically for local service businesses tired of low-quality leads
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <Card key={benefit.title}>
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-muted/50 -mx-4 px-4 py-16 sm:-mx-8 sm:px-8 lg:-mx-16 lg:px-16">
          <div className="container mx-auto">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                How LeadFlip Works for Businesses
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                From signup to closing deals in 5 simple steps
              </p>
            </div>

            <div className="mx-auto max-w-3xl space-y-6">
              {howItWorks.map((item) => (
                <Card key={item.step}>
                  <CardContent className="flex items-start gap-6 pt-6">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              What Business Owners Are Saying
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author}>
                <CardContent className="pt-6">
                  <p className="mb-6 text-sm leading-relaxed">
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="border-t border-border pt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Comparison */}
        <div className="rounded-xl border border-border bg-card p-8 md:p-12">
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              LeadFlip vs. Traditional Lead Gen
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-xl font-semibold text-muted-foreground">
                Traditional Services (HomeAdvisor, Thumbtack, etc.)
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>Pay $15-$80 per lead (whether you close or not)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>Compete with 5-10 other businesses for the same lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>High percentage of tire-kickers and spam</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>No pre-qualification or follow-up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">✗</span>
                  <span>Costs can spiral to $500-$1000/month quickly</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-xl font-semibold text-primary">
                LeadFlip
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Simple monthly subscription ($49-$149)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Limited competition in your service area</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>AI pre-qualifies every lead before you see it</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Optional AI calling to qualify and schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Predictable costs, cancel anytime</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 md:p-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Get Better Leads?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Start your 14-day free trial. No credit card required.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/sign-up">Start Free Trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Questions? <Link href="/contact" className="text-primary hover:underline">Contact us</Link> or{" "}
              <Link href="/pricing" className="text-primary hover:underline">view pricing details</Link>
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
