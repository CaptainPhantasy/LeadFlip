import { SiteShell } from "@/components/site-shell"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            God-level access to all system functions
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <AdminDashboard />
        </Suspense>
      </div>
    </SiteShell>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-border">
          <CardHeader>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
