"use client"

import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  FileText,
  Building2,
  Phone,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { useUser } from "@clerk/nextjs"

export function AdminDashboard() {
  const { user } = useUser()

  // Fetch admin stats
  const stats = trpc.admin.getStats.useQuery()
  const recentLeads = trpc.admin.getRecentLeads.useQuery({ limit: 10 })
  const systemHealth = trpc.admin.getSystemHealth.useQuery()

  if (stats.isLoading) {
    return <div className="text-center py-12">Loading admin data...</div>
  }

  if (stats.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            {stats.error.message === 'Admin access required'
              ? 'You do not have admin privileges. Contact a god-level admin to grant access.'
              : stats.error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Admin Info Banner */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            God-Level Admin Access
          </CardTitle>
          <CardDescription>
            Logged in as: <span className="font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
            <br />
            User ID: <code className="text-xs">{user?.id}</code>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.data?.totalLeads || 0}
          icon={FileText}
          description="All time submissions"
        />
        <StatCard
          title="Active Businesses"
          value={stats.data?.totalBusinesses || 0}
          icon={Building2}
          description="Registered businesses"
        />
        <StatCard
          title="Total Matches"
          value={stats.data?.totalMatches || 0}
          icon={Activity}
          description="Lead-business connections"
        />
        <StatCard
          title="AI Calls"
          value={stats.data?.totalCalls || 0}
          icon={Phone}
          description="Autonomous calls made"
        />
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <HealthItem
              label="Database"
              status={systemHealth.data?.database || 'unknown'}
            />
            <HealthItem
              label="Claude Agent SDK"
              status={systemHealth.data?.agents || 'unknown'}
            />
            <HealthItem
              label="SignalWire Voice"
              status={systemHealth.data?.signalwire || 'unknown'}
            />
            <HealthItem
              label="BullMQ Workers"
              status={systemHealth.data?.workers || 'unknown'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Lead Submissions</CardTitle>
          <CardDescription>Latest 10 leads across all consumers</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLeads.data && recentLeads.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.data.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-mono text-xs">
                      {lead.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {lead.problem_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.quality_score >= 7 ? 'default' : 'secondary'}>
                        {lead.quality_score}/10
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.match_count || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === 'matched'
                            ? 'default'
                            : lead.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No leads yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Admin tools and utilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/audit">
                <FileText className="mr-2 h-4 w-4" />
                View Audit Logs
              </Link>
            </Button>
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Review Businesses
            </Button>
            <Button variant="outline">
              <Phone className="mr-2 h-4 w-4" />
              Call History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number
  icon: any
  description: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function HealthItem({ label, status }: { label: string; status: string }) {
  const isHealthy = status === 'healthy' || status === 'connected'

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {status}
            </Badge>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {status}
            </Badge>
          </>
        )}
      </div>
    </div>
  )
}
