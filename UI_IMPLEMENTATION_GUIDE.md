# LeadFlip UI Implementation Guide for Parallel Subagents

## 🎯 Mission
Implement a modern, accessible UI for LeadFlip using ShadCN components, Tailwind CSS, and Next.js 15 best practices. This guide ensures all subagents work in harmony without conflicts.

---

## ⚠️ CRITICAL RULES - READ FIRST

### Lint & Bug Prevention
1. **ALWAYS run `npm run lint` after making changes** - Fix ALL errors before completing your task
2. **NEVER use unsupported Tailwind variants** - Check tailwind.config.ts for available variants
3. **ALWAYS import components from `@/components/ui/*`** - Use path aliases consistently
4. **NEVER hardcode colors** - Use CSS variables from globals.css (e.g., `bg-background`, `text-foreground`)
5. **ALWAYS use `cn()` utility** for className merging - Import from `@/lib/utils`
6. **TypeScript strict mode is ON** - No implicit `any`, all props must be typed
7. **React 19 is in use** - Follow React 19 best practices (no legacy patterns)
8. **Next.js 15 App Router** - Use `app/` directory structure, not `pages/`

### Code Quality Standards
```typescript
// ✅ CORRECT - Type-safe, uses design tokens
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline";
}

export function Button({ variant = "default", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground",
        variant === "destructive" && "bg-destructive text-destructive-foreground",
        className
      )}
      {...props}
    />
  );
}

// ❌ WRONG - No types, hardcoded colors
export function Button({ variant, className, ...props }) {
  return (
    <button
      className={`rounded-md bg-blue-600 text-white ${className}`}
      {...props}
    />
  );
}
```

---

## 📦 Current Stack Audit

### ✅ Already Configured
- **Next.js**: 15.2.3 with App Router
- **React**: 19.0.0 (latest)
- **TypeScript**: 5.x (strict mode enabled)
- **Tailwind CSS**: 3.4.1 with `tailwindcss-animate` plugin
- **Fonts**: Inter (Google Fonts) loaded in layout.tsx
- **Auth**: Clerk integrated with ClerkProvider in root layout
- **Utilities**: `cn()` helper exists in `src/lib/utils.ts`
- **Path Aliases**: `@/*` maps to `./src/*`

### ❌ Missing (Your Tasks)
- **components.json** - No ShadCN config file yet
- **ShadCN Components** - No primitives installed (button, card, form, etc.)
- **Theme Provider** - No next-themes integration yet
- **Navigation** - No nav components exist
- **Icons** - lucide-react installed but no icon helper
- **Layout Shell** - No reusable page wrapper

---

## 🎨 Design System Specification

### Color Palette (CSS Variables in globals.css)

**Current Tokens (PRESERVE THESE):**
```css
:root {
  /* Semantic colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ...existing tokens... */

  /* Chart colors (DO NOT REMOVE) */
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}

.dark {
  /* Dark mode tokens */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ...existing dark tokens... */
}
```

**NEW Warm Theme (ADD THIS):**
```css
[data-theme="warm"] {
  --background: 30 20% 98%;
  --foreground: 20 14% 10%;
  --primary: 24 80% 50%;        /* Sunset orange */
  --primary-foreground: 0 0% 100%;
  --secondary: 45 90% 60%;      /* Golden yellow */
  --secondary-foreground: 20 14% 10%;
  --accent: 15 85% 55%;         /* Warm coral */
  --accent-foreground: 0 0% 100%;
  --muted: 30 30% 92%;
  --muted-foreground: 20 10% 40%;
  --border: 30 25% 85%;
  --input: 30 25% 85%;
  --ring: 24 80% 50%;
}
```

### Typography Scale
- **Headings**: Use Inter font (already loaded)
- **Body**: Inter, 16px base (default)
- **Scale**: text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px)

### Spacing System
- **Base unit**: 4px (Tailwind default)
- **Container max-width**: 1280px (max-w-7xl)
- **Section padding**: py-16 md:py-24
- **Component gaps**: gap-4 (16px) for tight, gap-8 (32px) for loose

### Border Radius
- **Small**: sm (calc(var(--radius) - 4px)) = 4px
- **Medium**: md (calc(var(--radius) - 2px)) = 6px
- **Large**: lg (var(--radius)) = 8px
- **Full**: rounded-full for pills/avatars

---

## 🛠️ Implementation Tasks by Subagent

### Agent 1: Foundation Setup (PRIORITY 1)
**Files to Create/Modify:**
- `components.json` (new)
- `src/components/ui/` directory (new)
- Run ShadCN init command

**Commands to Run:**
```bash
# Initialize ShadCN (review diff before accepting)
npx shadcn@latest init --defaults=false

# Add core components (one by one to avoid conflicts)
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add sheet
npx shadcn@latest add form

# Verify no lint errors
npm run lint
```

**Lint Prevention:**
- After adding each component, check that imports resolve: `import { Button } from "@/components/ui/button"`
- Ensure no duplicate `cn()` utility is added (we already have one in `src/lib/utils.ts`)
- Verify TypeScript types compile: `npx tsc --noEmit`

**Success Criteria:**
- [ ] components.json exists with correct paths
- [ ] All 10+ ShadCN components installed in `src/components/ui/`
- [ ] No lint errors: `npm run lint` passes
- [ ] No TypeScript errors: `npx tsc --noEmit` passes

---

### Agent 2: Theme Infrastructure (PRIORITY 1)
**Files to Create/Modify:**
- `src/components/theme-provider.tsx` (new)
- `src/components/ui/theme-toggle.tsx` (new)
- `src/app/layout.tsx` (modify - wrap children with ThemeProvider)
- `src/app/globals.css` (modify - add warm theme tokens)

**Dependencies to Install:**
```bash
npm install next-themes
```

**Implementation:**

**File: `src/components/theme-provider.tsx`**
```typescript
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

**File: `src/components/ui/theme-toggle.tsx`**
```typescript
"use client"

import * as React from "react"
import { Moon, Sun, Sunset } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("warm")}>
          <Sunset className="mr-2 h-4 w-4" />
          Warm
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Update: `src/app/layout.tsx`**
```typescript
import { ThemeProvider } from "@/components/theme-provider"

// Inside <body>, wrap {children} with:
<ThemeProvider
  attribute="data-theme"
  defaultTheme="light"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

**Update: `src/app/globals.css`**
Add the warm theme tokens from the Design System section above.

**Lint Prevention:**
- Ensure `"use client"` directive is at the top of client components
- Import lucide icons correctly: `import { Sun } from "lucide-react"`
- No hardcoded theme values - use CSS variables only

**Success Criteria:**
- [ ] next-themes installed and provider configured
- [ ] ThemeToggle component works (test manually: `npm run dev`)
- [ ] All three themes render correctly (light/dark/warm)
- [ ] No hydration errors in console
- [ ] `npm run lint` passes

---

### Agent 3: Navigation & Layout Shell (PRIORITY 2)
**Files to Create:**
- `src/components/navigation.tsx` (new)
- `src/components/site-shell.tsx` (new)
- `src/components/ui/icon.tsx` (new - icon helper)

**Dependencies:**
Already installed: `lucide-react`

**Implementation:**

**File: `src/components/ui/icon.tsx`**
```typescript
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconProps {
  icon: LucideIcon
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function Icon({ icon: IconComponent, className, size = "md" }: IconProps) {
  return <IconComponent className={cn(sizeMap[size], className)} />
}
```

**File: `src/components/navigation.tsx`**
```typescript
"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, Phone, Users, LayoutDashboard } from "lucide-react"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/consumer", label: "Post a Problem", icon: Phone },
  { href: "/business", label: "For Businesses", icon: Users },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LeadFlip</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <SignedOut>
              <Button asChild variant="default" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2 text-lg font-medium"
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**File: `src/components/site-shell.tsx`**
```typescript
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
```

**Lint Prevention:**
- `"use client"` for Navigation (uses useState)
- SiteShell is server component (no "use client")
- Import Sheet from `@/components/ui/sheet` (ensure Agent 1 installed it)
- All icons from lucide-react

**Success Criteria:**
- [ ] Navigation renders on all viewports (mobile sheet menu works)
- [ ] SiteShell wraps content with nav + footer
- [ ] No layout shift or hydration errors
- [ ] `npm run lint` passes

---

### Agent 4: Landing Page Redesign (PRIORITY 2)
**Files to Modify:**
- `src/app/page.tsx` (complete redesign)

**Files to Create:**
- `src/components/marketing/hero.tsx` (new)
- `src/components/marketing/features.tsx` (new)
- `src/components/marketing/testimonials.tsx` (new)
- `src/components/marketing/cta-section.tsx` (new)

**Implementation:**

**File: `src/components/marketing/hero.tsx`**
```typescript
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
              <Link href="/business">For Businesses</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Gradient blur background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-3xl" />
    </section>
  )
}
```

**File: `src/components/marketing/features.tsx`**
```typescript
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
```

**File: `src/components/marketing/testimonials.tsx`**
```typescript
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const testimonials = [
  {
    quote: "Got 3 qualified plumbing leads in the first week. The AI calls are surprisingly natural.",
    author: "Sarah Johnson",
    business: "ABC Plumbing",
    initials: "SJ",
  },
  {
    quote: "No more wasting time on low-quality leads. The AI pre-qualifies them before I even see them.",
    author: "Mike Chen",
    business: "Chen's Lawn Care",
    initials: "MC",
  },
  {
    quote: "As a consumer, I love not having to call 10 businesses. I post once and they come to me.",
    author: "Emily Davis",
    business: "Homeowner",
    initials: "ED",
  },
]

export function Testimonials() {
  return (
    <section className="bg-muted/50 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by Local Businesses
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="border-border">
              <CardContent className="pt-6">
                <p className="mb-4 text-sm leading-relaxed text-foreground/90">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.business}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**File: `src/components/marketing/cta-section.tsx`**
```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center md:p-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join hundreds of local businesses using AI to generate qualified leads.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/sign-up">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/business">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**File: `src/app/page.tsx` (complete redesign)**
```typescript
import { SiteShell } from "@/components/site-shell"
import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { Testimonials } from "@/components/marketing/testimonials"
import { CTASection } from "@/components/marketing/cta-section"

export default function HomePage() {
  return (
    <SiteShell maxWidth="full" className="p-0">
      <Hero />
      <Features />
      <Testimonials />
      <CTASection />
    </SiteShell>
  )
}
```

**Lint Prevention:**
- All components are server components (no "use client" needed)
- Icons imported from lucide-react
- Card components imported from `@/components/ui/card`
- No inline styles - use Tailwind classes only

**Success Criteria:**
- [ ] Landing page renders with hero, features, testimonials, CTA
- [ ] All links work (`/consumer`, `/business`, `/sign-up`)
- [ ] Responsive on mobile (test at 360px width)
- [ ] `npm run lint` passes

---

### Agent 5: Forms & Dialogs (PRIORITY 3)
**Files to Create:**
- `src/app/consumer/page.tsx` (new - "Post a Problem" form)
- `src/components/forms/problem-submission-form.tsx` (new)

**Dependencies:**
ShadCN form already installed by Agent 1

**Implementation:**

**File: `src/components/forms/problem-submission-form.tsx`**
```typescript
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  problemText: z.string().min(10, "Please describe your problem in at least 10 characters"),
  zipCode: z.string().regex(/^\d{5}$/, "Please enter a valid 5-digit ZIP code"),
  phone: z.string().regex(/^\+?1?\d{10,}$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  budget: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function ProblemSubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemText: "",
      zipCode: "",
      phone: "",
      email: "",
      budget: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      // TODO: Replace with actual tRPC call
      console.log("Form submitted:", values)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call

      // Show success message
      alert("Problem submitted! We're matching you with local businesses.")
      form.reset()
    } catch (error) {
      console.error("Submission error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="problemText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What do you need help with?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Example: My water heater is leaking and needs urgent repair. Budget around $500."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Be specific about the problem, urgency, and budget for better matches.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input placeholder="46032" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="$500" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Find Local Businesses"}
        </Button>
      </form>
    </Form>
  )
}
```

**File: `src/app/consumer/page.tsx`**
```typescript
import { SiteShell } from "@/components/site-shell"
import { ProblemSubmissionForm } from "@/components/forms/problem-submission-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConsumerPage() {
  return (
    <SiteShell maxWidth="2xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Post Your Problem</h1>
          <p className="text-lg text-muted-foreground">
            Describe what you need help with and we'll match you with local businesses
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Problem Details</CardTitle>
            <CardDescription>
              Our AI will analyze your request and match you with qualified local service providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProblemSubmissionForm />
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  )
}
```

**Lint Prevention:**
- `"use client"` for form component (uses hooks)
- Page component is server component
- Form schema uses zod (already installed)
- All imports from `@/components/ui/*`

**Success Criteria:**
- [ ] Form validates correctly (test empty fields, invalid ZIP, invalid email)
- [ ] Submit button shows loading state
- [ ] Form resets after successful submission
- [ ] Accessible (test with keyboard only)
- [ ] `npm run lint` passes

---

## 🧪 Testing Checklist (ALL Agents)

Before marking your task complete, verify:

### Lint & Build
- [ ] Run `npm run lint` - 0 errors, 0 warnings
- [ ] Run `npx tsc --noEmit` - 0 TypeScript errors
- [ ] Run `npm run build` - Build succeeds without errors

### Visual QA
- [ ] Test at 360px width (mobile)
- [ ] Test at 768px width (tablet)
- [ ] Test at 1440px width (desktop)
- [ ] Test all three themes (light/dark/warm)
- [ ] Verify no layout shift on load
- [ ] Check focus states on interactive elements

### Accessibility
- [ ] All interactive elements reachable via keyboard
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA (use browser dev tools)
- [ ] Screen reader landmarks present (nav, main, footer)

### Performance
- [ ] No console errors or warnings
- [ ] No hydration mismatches
- [ ] Fonts load without FOUT (flash of unstyled text)

---

## 📁 File Structure Reference

```
/Volumes/Storage/Development/LegacyCall/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (modify: add ThemeProvider)
│   │   ├── page.tsx                # Landing page (redesign)
│   │   ├── consumer/
│   │   │   └── page.tsx            # NEW: Consumer form page
│   │   └── globals.css             # Modify: add warm theme tokens
│   ├── components/
│   │   ├── ui/                     # NEW: ShadCN components (Agent 1)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── theme-toggle.tsx    # NEW (Agent 2)
│   │   │   └── icon.tsx            # NEW (Agent 3)
│   │   ├── theme-provider.tsx      # NEW (Agent 2)
│   │   ├── navigation.tsx          # NEW (Agent 3)
│   │   ├── site-shell.tsx          # NEW (Agent 3)
│   │   ├── marketing/              # NEW (Agent 4)
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   ├── testimonials.tsx
│   │   │   └── cta-section.tsx
│   │   └── forms/                  # NEW (Agent 5)
│   │       └── problem-submission-form.tsx
│   └── lib/
│       └── utils.ts                # EXISTS: cn() utility (do not modify)
├── components.json                 # NEW (Agent 1)
├── tailwind.config.ts              # EXISTS (do not modify)
├── package.json                    # Modify: add next-themes
└── UI_IMPLEMENTATION_GUIDE.md      # This file
```

---

## 🚀 Agent Deployment Order

1. **Agent 1 (Foundation)** - Must complete FIRST (others depend on ShadCN components)
2. **Agent 2 (Theme)** - Can run in parallel with Agent 3
3. **Agent 3 (Navigation)** - Can run in parallel with Agent 2
4. **Agent 4 (Landing Page)** - Requires Agents 1, 2, 3 complete
5. **Agent 5 (Forms)** - Requires Agents 1, 2, 3 complete

**Parallel Groups:**
- Group A (Sequential): Agent 1 → Agents 2 & 3 (parallel) → Agents 4 & 5 (parallel)

---

## 📞 Communication Protocol

If you encounter a blocker:
1. **Check this guide first** - Most answers are here
2. **Check existing code** - Read before modifying
3. **Report in your final message** - List what you completed and any issues

---

## ✅ Final Deliverables

Each agent should report:
1. **Files created/modified** - Full list with line counts
2. **Commands run** - Copy/paste terminal output
3. **Lint results** - Screenshot or paste `npm run lint` output
4. **Test results** - What you manually tested (theme toggle, form validation, etc.)
5. **Blockers** - Any unresolved issues or dependencies on other agents

---

**Good luck! Remember: Lint early, lint often. Quality > Speed.**
