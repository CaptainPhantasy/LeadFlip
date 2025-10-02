import { SiteShell } from "@/components/site-shell"
import { ConsumerDashboard } from "@/components/consumer/consumer-dashboard"

export default function ConsumerDashboardPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">My Leads</h1>
          <p className="text-muted-foreground">
            Track your submitted problems and matched businesses
          </p>
        </div>

        <ConsumerDashboard />
      </div>
    </SiteShell>
  )
}
