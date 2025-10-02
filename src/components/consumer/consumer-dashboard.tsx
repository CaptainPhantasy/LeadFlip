"use client"

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
  FileText,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
} from "lucide-react"
import { useState } from "react"
import { LeadDetailModal } from "./lead-detail-modal"

export function ConsumerDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const leads = trpc.lead.getMyLeads.useQuery()
  const stats = trpc.lead.getMyStats.useQuery()

  if (leads.isLoading) {
    return <div className="text-center py-12">Loading your leads...</div>
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

  // Filter leads by status if selected
  const filteredLeads = selectedStatus
    ? leads.data?.filter((lead: any) => lead.status === selectedStatus)
    : leads.data

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Problems submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Leads</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.matchedLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Connected with businesses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.totalMatches || 0}</div>
            <p className="text-xs text-muted-foreground">Businesses interested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.data?.avgQualityScore || '0.00'}/10</div>
            <p className="text-xs text-muted-foreground">Lead quality rating</p>
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
          variant={selectedStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('pending')}
        >
          Pending
        </Button>
        <Button
          variant={selectedStatus === 'matched' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('matched')}
        >
          Matched
        </Button>
        <Button
          variant={selectedStatus === 'processing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('processing')}
        >
          Processing
        </Button>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submitted Leads</CardTitle>
          <CardDescription>
            Track the status of your problem submissions and matched businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeads && filteredLeads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="max-w-md">
                      <div className="font-medium line-clamp-2">{lead.problem_text}</div>
                      {lead.classified_data?.service_category && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Category: {lead.classified_data.service_category}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (lead.quality_score || 0) >= 7
                            ? 'default'
                            : (lead.quality_score || 0) >= 5
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {lead.quality_score ? `${lead.quality_score}/10` : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {lead.matches?.length || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === 'matched'
                            ? 'default'
                            : lead.status === 'processing'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {lead.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <Target className="mr-1 h-3 w-3" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedStatus
                  ? `No ${selectedStatus} leads found`
                  : 'Submit your first problem to get matched with local businesses'}
              </p>
              <Button className="mt-4" onClick={() => window.location.href = '/consumer'}>
                Submit a Problem
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  )
}
