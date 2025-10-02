import { SiteShell } from "@/components/site-shell"
import { BusinessDashboard } from "@/components/business/business-dashboard"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function BusinessPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Business Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Manage your matched leads and AI calling preferences
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <BusinessDashboard />
        </Suspense>
      </div>
    </SiteShell>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-6">
            <div className="h-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
