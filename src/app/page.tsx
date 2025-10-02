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
