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
  Building2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { useState } from "react"
import { RequestAICallDialog } from "./request-ai-call-dialog"

export function BusinessDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<"active" | "accepted" | "declined" | "converted" | undefined>(undefined)
  const [aiCallDialogOpen, setAiCallDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)

  const profile = trpc.business.getProfile.useQuery()
  const leads = trpc.business.getLeads.useQuery({
    status: selectedStatus,
  })

  const stats = trpc.business.getStats.useQuery()
  const respondToLead = trpc.business.respondToLead.useMutation({
    onSuccess: () => {
      leads.refetch()
      stats.refetch()
    },
  })

  if (leads.isLoading || profile.isLoading) {
    return <div className="text-center py-12">Loading your matched leads...</div>
  }

  // Show profile creation prompt if no business profile exists
  if (!profile.data) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Welcome to LeadFlip Business
          </CardTitle>
          <CardDescription>
            You need to create a business profile to start receiving matched leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your business profile helps us match you with relevant consumer requests in your service area.
          </p>
          <Button asChild>
            <Link href="/business/settings">
              <Building2 className="mr-2 h-4 w-4" />
              Create Business Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (leads.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Leads
          </CardTitle>
          <CardDescription>{leads.error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">All time matches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.pendingLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.acceptedLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Leads you're pursuing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.responseRate || '0%'}</div>
            <p className="text-xs text-muted-foreground">24hr response avg</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={selectedStatus === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus(undefined)}
        >
          All Leads
        </Button>
        <Button
          variant={selectedStatus === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('active')}
        >
          Active
        </Button>
        <Button
          variant={selectedStatus === 'accepted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('accepted')}
        >
          Accepted
        </Button>
        <Button
          variant={selectedStatus === 'declined' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('declined')}
        >
          Declined
        </Button>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Matched Leads</CardTitle>
          <CardDescription>
            Leads that match your business profile and service area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.data && leads.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.data.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="max-w-md">
                      <div className="font-medium">{lead.problem_text}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.quality_score >= 7 ? 'default' : 'secondary'}>
                        {lead.quality_score}/10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.location_zip || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lead.match_score ? `${lead.match_score}%` : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.response_status === 'accepted'
                            ? 'default'
                            : lead.response_status === 'declined'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {lead.response_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.response_status === 'pending' || !lead.response_status ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => respondToLead.mutate({
                              leadId: lead.id,
                              response: 'accept',
                            })}
                            disabled={respondToLead.isPending}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToLead.mutate({
                              leadId: lead.id,
                              response: 'decline',
                            })}
                            disabled={respondToLead.isPending}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      ) : lead.response_status === 'accepted' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLead(lead)
                            setAiCallDialogOpen(true)
                          }}
                        >
                          <Phone className="mr-1 h-3 w-3" />
                          Request AI Call
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Declined
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedStatus
                  ? `No ${selectedStatus} leads found`
                  : 'Matched leads will appear here when consumers submit problems in your area'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Call Request Dialog */}
      {selectedLead && (
        <RequestAICallDialog
          open={aiCallDialogOpen}
          onOpenChange={setAiCallDialogOpen}
          lead={{
            id: selectedLead.lead_id || selectedLead.id,
            problem_text: selectedLead.leads?.problem_text || selectedLead.problem_text || "",
            service_category: selectedLead.leads?.service_category || selectedLead.service_category,
            urgency: selectedLead.leads?.urgency || selectedLead.urgency,
            location_zip: selectedLead.leads?.location_zip || selectedLead.location_zip,
          }}
        />
      )}
    </div>
  )
}
