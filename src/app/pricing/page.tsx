import Link from "next/link"
import { Check, X } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out LeadFlip",
    features: [
      "Submit unlimited consumer leads",
      "Email notifications only",
      "Basic lead matching",
      "View matched businesses",
      "Community support",
    ],
    limitations: [
      "No AI calling features",
      "No priority matching",
      "Limited analytics",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "Great for small businesses",
    features: [
      "Everything in Free, plus:",
      "20 AI calls included",
      "SMS + Email notifications",
      "Priority matching algorithm",
      "Call transcripts & recordings",
      "Email support",
      "Lead analytics dashboard",
    ],
    limitations: ["$2.45/call after limit"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/mo",
    description: "For growing service businesses",
    features: [
      "Everything in Starter, plus:",
      "100 AI calls included",
      "Advanced lead scoring",
      "Custom response templates",
      "Real-time analytics dashboard",
      "CRM integrations",
      "Team management",
      "Priority phone support",
    ],
    limitations: ["$1.50/call after limit"],
    cta: "Start Free Trial",
    highlighted: false,
  },
]

const comparisonFeatures = [
  {
    category: "Lead Management",
    features: [
      { name: "Monthly leads", free: "Unlimited", starter: "Unlimited", pro: "Unlimited" },
      { name: "Lead matching", free: "Basic", starter: "Priority", pro: "Advanced AI" },
      { name: "Lead quality score", free: false, starter: true, pro: true },
      { name: "Analytics dashboard", free: false, starter: true, pro: true },
      { name: "Real-time updates", free: true, starter: true, pro: true },
    ],
  },
  {
    category: "AI Calling",
    features: [
      { name: "AI calls included", free: "0", starter: "20/mo", pro: "100/mo" },
      { name: "Additional call cost", free: "N/A", starter: "$2.45", pro: "$1.50" },
      { name: "Call transcripts", free: false, starter: true, pro: true },
      { name: "Call recordings", free: false, starter: true, pro: true },
      { name: "Custom call scripts", free: false, starter: false, pro: true },
    ],
  },
  {
    category: "Support & Features",
    features: [
      { name: "Support type", free: "Community", starter: "Email", pro: "Priority Phone" },
      { name: "CRM integrations", free: false, starter: false, pro: true },
      { name: "Team management", free: false, starter: false, pro: true },
      { name: "API access", free: false, starter: false, pro: true },
      { name: "Custom branding", free: false, starter: false, pro: true },
    ],
  },
]

export default function PricingPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Choose the plan that fits your business. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={
                tier.highlighted
                  ? "border-primary shadow-lg ring-2 ring-primary relative"
                  : ""
              }
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground ml-2">{tier.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                  {tier.limitations.map((limitation, index) => (
                    <li key={`limit-${index}`} className="flex items-start gap-3 text-muted-foreground">
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant={tier.highlighted ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  <Link href="/sign-up">{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Compare Plans</h2>
            <p className="text-muted-foreground mt-2">
              Detailed feature breakdown across all tiers
            </p>
          </div>

          <div className="space-y-8">
            {comparisonFeatures.map((category) => (
              <div key={category.category} className="space-y-4">
                <h3 className="text-xl font-semibold">{category.category}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Feature</TableHead>
                      <TableHead>Free</TableHead>
                      <TableHead>Starter</TableHead>
                      <TableHead>Professional</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.features.map((feature) => (
                      <TableRow key={feature.name}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>
                          {typeof feature.free === "boolean" ? (
                            feature.free ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            feature.free
                          )}
                        </TableCell>
                        <TableCell>
                          {typeof feature.starter === "boolean" ? (
                            feature.starter ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            feature.starter
                          )}
                        </TableCell>
                        <TableCell>
                          {typeof feature.pro === "boolean" ? (
                            feature.pro ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            feature.pro
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 border-t border-border pt-16">
          <h2 className="mb-8 text-center text-3xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-6">
            {[
              {
                question: "What counts as an AI call?",
                answer: "An AI call is any outbound call made by our AI agent to a consumer on your behalf. Unanswered calls, voicemails, and completed conversations all count as one call. Call duration doesn't affect pricing.",
              },
              {
                question: "Can I upgrade or downgrade my plan?",
                answer: "Yes! You can upgrade or downgrade at any time. When upgrading, you'll be charged a prorated amount for the remainder of your billing cycle. Downgrades take effect at the start of your next billing period.",
              },
              {
                question: "What happens if I exceed my AI call limit?",
                answer: "Additional calls are automatically charged at the per-call rate for your tier ($2.45 for Starter, $1.50 for Professional). You can set spending limits in your dashboard to control costs.",
              },
              {
                question: "Is there a free trial?",
                answer: "Yes! Starter and Professional plans include a 14-day free trial with no credit card required. You'll get full access to all features during your trial period.",
              },
              {
                question: "How does lead matching work?",
                answer: "Our AI analyzes consumer problems and matches them with businesses based on service category, location, ratings, capacity, and pricing. Professional tier includes advanced scoring that learns from your conversion patterns.",
              },
              {
                question: "Can I cancel anytime?",
                answer: "Absolutely. You can cancel your subscription at any time with no cancellation fees. You'll retain access to your plan features until the end of your billing period.",
              },
            ].map((faq) => (
              <Card key={faq.question}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 rounded-xl bg-primary/5 p-8 md:p-12 text-center space-y-4">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join hundreds of local businesses turning leads into customers with AI-powered calling.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg">
              <Link href="/sign-up">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
