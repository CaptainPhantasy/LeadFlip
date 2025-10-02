import { SiteShell } from "@/components/site-shell"
import { AuditLogViewer } from "@/components/admin/audit-log-viewer"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function AdminAuditPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-lg text-muted-foreground">
            Track system events and administrative actions
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <AuditLogViewer />
        </Suspense>
      </div>
    </SiteShell>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="py-12">
        <div className="flex items-center justify-center">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}
