"use client"

import { Suspense } from "react"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ExternalLink, Calendar, Users } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { StatsCards } from "@/components/admin/discovery/stats-cards"
import { MarketBreakdown } from "@/components/admin/discovery/market-breakdown"
import { ScanTrigger } from "@/components/admin/discovery/scan-trigger"

export default function DiscoveryDashboardPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight">
              Business Discovery
            </h1>
            <p className="text-lg text-muted-foreground">
              Indiana Launch - Automated business discovery and invitation system
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/discovery/prospects">
              <Users className="mr-2 h-4 w-4" />
              View All Prospects
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <Suspense fallback={<LoadingSkeleton />}>
          <DiscoveryDashboard />
        </Suspense>
      </div>
    </SiteShell>
  )
}

function DiscoveryDashboard() {
  const stats = trpc.discovery.getStats.useQuery()

  // Error state
  if (stats.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Discovery Data
          </CardTitle>
          <CardDescription>
            {stats.error.message === 'Admin access required'
              ? 'You do not have admin privileges to access this page.'
              : stats.error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Loading state
  if (stats.isLoading) {
    return <LoadingSkeleton />
  }

  const data = stats.data

  // [2025-10-01 8:35 PM] Agent 1: Handle undefined data case for TypeScript
  if (!data) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Overview</h2>
        <StatsCards stats={data} />
      </div>

      {/* Market and Service Breakdown */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Market Analysis</h2>
        <MarketBreakdown stats={data} />
      </div>

      {/* Next Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Actions
          </CardTitle>
          <CardDescription>
            Upcoming automated tasks and pending actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.nextActions.length > 0 ? (
            <div className="space-y-3">
              {data.nextActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        action.type === 'invitation'
                          ? 'default'
                          : action.type === 'follow_up'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {action.type.replace('_', ' ')}
                    </Badge>
                    <div>
                      <div className="font-medium">{action.description}</div>
                      {action.scheduledFor && (
                        <div className="text-sm text-muted-foreground">
                          Scheduled: {new Date(action.scheduledFor).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{action.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No pending actions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Scan Trigger */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Manual Actions</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ScanTrigger />

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>
                Related admin pages and tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/discovery/prospects">
                  <Users className="mr-2 h-4 w-4" />
                  View All Prospects
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Admin Dashboard
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div className="space-y-1">
              <div className="font-medium text-blue-900">
                About Business Discovery
              </div>
              <div className="text-sm text-blue-800">
                The discovery system automatically scans Google Places for qualified local
                service businesses, sends personalized invitations, and tracks activation.
                Scans run weekly, but you can trigger manual scans as needed.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Loading */}
      <div>
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
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
      </div>

      {/* Market Breakdown Loading */}
      <div>
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
