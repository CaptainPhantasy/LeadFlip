"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { FileText, Filter, Play, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AuditEvent {
  id: string
  event_type: string
  user_id: string
  target_user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'admin_role_granted', label: 'Admin Role Granted' },
  { value: 'admin_role_revoked', label: 'Admin Role Revoked' },
  { value: 'lead_flagged', label: 'Lead Flagged' },
  { value: 'business_suspended', label: 'Business Suspended' },
  { value: 'business_approved', label: 'Business Approved' },
  { value: 'audit_triggered', label: 'Audit Triggered' },
  { value: 'system_config_updated', label: 'System Config Updated' },
  { value: 'lead_quality_review', label: 'Lead Quality Review' },
  { value: 'call_quota_exceeded', label: 'Call Quota Exceeded' },
  { value: 'database_backup', label: 'Database Backup' },
]

export function AuditLogViewer() {
  const { toast } = useToast()
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [userIdFilter, setUserIdFilter] = useState('')

  const events = trpc.admin.getAuditEvents.useQuery({
    eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
    userId: userIdFilter || undefined,
    limit: 100,
    offset: 0,
  })

  const triggerAudit = trpc.admin.triggerAudit.useMutation({
    onSuccess: () => {
      toast({
        title: "Audit Triggered",
        description: "Manual audit has been queued and will run shortly",
      })
    },
    onError: (error) => {
      toast({
        title: "Failed to trigger audit",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'admin_role_granted':
      case 'admin_role_revoked':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />
      case 'lead_flagged':
      case 'business_suspended':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'business_approved':
      case 'audit_triggered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    if (eventType.includes('granted') || eventType.includes('approved')) {
      return 'default'
    }
    if (eventType.includes('revoked') || eventType.includes('suspended') || eventType.includes('flagged')) {
      return 'destructive'
    }
    return 'secondary'
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata) return 'N/A'

    try {
      const entries = Object.entries(metadata)
      if (entries.length === 0) return 'N/A'

      return entries
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')
    } catch {
      return 'N/A'
    }
  }

  if (events.isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading audit logs...</div>
        </CardContent>
      </Card>
    )
  }

  if (events.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Audit Logs
          </CardTitle>
          <CardDescription>{events.error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Viewer
            </CardTitle>
            <CardDescription>
              System events and admin actions. Total events: {events.data?.total || 0}
            </CardDescription>
          </div>
          <Button
            onClick={() => triggerAudit.mutate()}
            disabled={triggerAudit.isPending}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Trigger Manual Audit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Event Type</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">User ID</label>
            <Input
              placeholder="Filter by user ID (optional)"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setEventTypeFilter('all')
                setUserIdFilter('')
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Events Table */}
        {events.data && events.data.events.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.data.events.map((event: AuditEvent) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {getEventIcon(event.event_type)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEventBadgeVariant(event.event_type)}>
                        {formatEventType(event.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.user_id === 'system' ? (
                        <Badge variant="outline">System</Badge>
                      ) : (
                        event.user_id.substring(0, 12) + '...'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.target_user_id ? (
                        event.target_user_id.substring(0, 12) + '...'
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {formatMetadata(event.metadata)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border py-12 text-center text-muted-foreground">
            No audit events found
          </div>
        )}

        {/* Mock Data Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <Info className="mr-2 inline-block h-4 w-4" />
            Currently showing mock data. Once the audit_events table is created, real audit logs will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
