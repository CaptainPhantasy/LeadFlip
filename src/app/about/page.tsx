import { Sparkles, Zap, Shield, Users, Brain, Phone } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import { Card, CardContent } from "@/components/ui/card"

const technologies = [
  {
    name: "Claude Agent SDK",
    icon: Brain,
    description: "Multi-agent orchestration for intelligent lead processing",
  },
  {
    name: "OpenAI Realtime API",
    icon: Phone,
    description: "Natural voice conversations with sub-500ms latency",
  },
  {
    name: "Next.js 15",
    icon: Zap,
    description: "Server-side rendering and API routes for optimal performance",
  },
  {
    name: "Supabase",
    icon: Shield,
    description: "PostgreSQL with Row-Level Security for data protection",
  },
]

const teamMembers = [
  {
    name: "Engineering Team",
    role: "Full-Stack Development",
    description: "Building the future of AI-powered lead marketplaces",
  },
  {
    name: "AI Research",
    role: "Agent Architecture",
    description: "Designing autonomous agents that understand business needs",
  },
  {
    name: "Customer Success",
    role: "Business Support",
    description: "Helping service businesses maximize lead conversion",
  },
]

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            About LeadFlip
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Revolutionizing Local Services with{" "}
            <span className="text-primary">AI Agents</span>
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            We&apos;re building the world&apos;s first reverse marketplace where consumers post
            problems and AI-powered agents match them with the perfect local business.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="mb-16 rounded-xl bg-primary/5 p-8">
          <h2 className="mb-4 text-2xl font-bold">Our Mission</h2>
          <p className="mb-4 text-muted-foreground">
            Traditional service marketplaces force businesses into bidding wars, spam
            consumers with generic quotes, and create friction at every step. We believe
            there&apos;s a better way.
          </p>
          <p className="mb-4 text-muted-foreground">
            LeadFlip flips the model: consumers describe their problem once, and our
            Claude-powered AI agents handle everything else—from intelligent matching to
            autonomous qualification calls. No bidding wars. No spam. Just qualified
            leads delivered to businesses that can actually help.
          </p>
          <p className="text-muted-foreground">
            We&apos;re leveraging breakthrough advancements in AI orchestration (Claude Agent
            SDK) and voice AI (OpenAI Realtime API) to create a marketplace that feels
            like magic for both consumers and businesses.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold">How We Do It</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">1. Consumer Posts Problem</h3>
                <p className="text-sm text-muted-foreground">
                  Consumers describe their need in plain English. Our Lead Classifier
                  agent extracts all the details—urgency, budget, location, requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">2. AI Matches Businesses</h3>
                <p className="text-sm text-muted-foreground">
                  Our Business Matcher agent scores compatibility based on location,
                  expertise, ratings, capacity, and historical performance.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">3. AI Calls to Qualify</h3>
                <p className="text-sm text-muted-foreground">
                  When requested, our Call Agent makes autonomous phone calls to verify
                  details, confirm availability, and schedule appointments.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold">Built on Cutting-Edge AI</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {technologies.map((tech) => (
              <Card key={tech.name}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <tech.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{tech.name}</h3>
                    <p className="text-sm text-muted-foreground">{tech.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold">Our Team</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {teamMembers.map((member) => (
              <Card key={member.name}>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-1 font-semibold">{member.name}</h3>
                  <p className="mb-2 text-sm text-primary">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-16 grid gap-8 rounded-xl border border-border p-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-primary">85%</div>
            <div className="text-sm text-muted-foreground">
              Average lead conversion rate
            </div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-primary">&lt;500ms</div>
            <div className="text-sm text-muted-foreground">AI call latency</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-primary">5 Agents</div>
            <div className="text-sm text-muted-foreground">
              Specialized AI subagents working 24/7
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="rounded-xl bg-muted/50 p-8">
          <h2 className="mb-6 text-2xl font-bold">Our Values</h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-1 font-semibold">Quality over Quantity</h3>
              <p className="text-sm text-muted-foreground">
                We focus on delivering highly qualified leads, not flooding businesses
                with low-value requests.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Transparency First</h3>
              <p className="text-sm text-muted-foreground">
                Every AI decision is explainable. Every call is transcribed. No black
                boxes.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">
                Consumer data is never sold. Row-Level Security ensures businesses only
                see their matched leads.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Continuous Learning</h3>
              <p className="text-sm text-muted-foreground">
                Our AI agents learn from every interaction, improving matching accuracy
                and conversation quality over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
