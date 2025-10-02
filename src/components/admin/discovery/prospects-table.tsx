"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Building2,
  Mail,
  XCircle,
  Star,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ProspectiveBusiness, ServiceCategory, InvitationStatus } from "@/types/discovery"

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'landscaping', label: 'Landscaping/Lawn Care' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'painting', label: 'Painting' },
  { value: 'carpentry', label: 'Carpentry/Handyman' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'general_contractor', label: 'General Contractors' },
]

const INVITATION_STATUSES: { value: InvitationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'invited', label: 'Invited' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'activated', label: 'Activated' },
  { value: 'declined', label: 'Declined' },
  { value: 'bounced', label: 'Bounced' },
]

function getStatusColor(status: InvitationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-500'
    case 'invited':
      return 'bg-blue-500'
    case 'clicked':
      return 'bg-purple-500'
    case 'activated':
      return 'bg-green-500'
    case 'declined':
      return 'bg-red-500'
    case 'bounced':
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

export function ProspectsTable() {
  const { toast } = useToast()
  const [page, setPage] = useState(0)
  const [limit] = useState(50)

  // Filters
  const [serviceCategory, setServiceCategory] = useState<string>('all')
  const [invitationStatus, setInvitationStatus] = useState<string>('all')
  const [zipCode, setZipCode] = useState<string>('')

  // Dialog state
  const [selectedProspect, setSelectedProspect] = useState<ProspectiveBusiness | null>(null)
  const [actionDialog, setActionDialog] = useState<'invite' | 'disqualify' | null>(null)
  const [disqualifyReason, setDisqualifyReason] = useState<string>('')

  const utils = trpc.useUtils()

  // Query prospects with filters
  const prospects = trpc.discovery.getProspects.useQuery({
    serviceCategory: serviceCategory && serviceCategory !== 'all' ? serviceCategory : undefined,
    invitationStatus: invitationStatus && invitationStatus !== 'all' ? invitationStatus : undefined,
    zipCode: zipCode || undefined,
    limit,
    offset: page * limit,
  })

  // Mutations
  const sendInvitation = trpc.discovery.sendInvitation.useMutation({
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `Invitation email sent to ${selectedProspect?.name}`,
      })
      setActionDialog(null)
      setSelectedProspect(null)
      utils.discovery.getProspects.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const disqualify = trpc.discovery.disqualify.useMutation({
    onSuccess: () => {
      toast({
        title: "Business disqualified",
        description: `${selectedProspect?.name} has been disqualified`,
      })
      setActionDialog(null)
      setSelectedProspect(null)
      setDisqualifyReason('')
      utils.discovery.getProspects.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Failed to disqualify",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSendInvite = (prospect: ProspectiveBusiness) => {
    setSelectedProspect(prospect)
    setActionDialog('invite')
  }

  const handleDisqualify = (prospect: ProspectiveBusiness) => {
    setSelectedProspect(prospect)
    setActionDialog('disqualify')
  }

  const confirmAction = () => {
    if (!selectedProspect) return

    if (actionDialog === 'invite') {
      sendInvitation.mutate({ prospectiveBusinessId: selectedProspect.id })
    } else if (actionDialog === 'disqualify') {
      disqualify.mutate({
        prospectiveBusinessId: selectedProspect.id,
        reason: disqualifyReason || 'Admin disqualified'
      })
    }
  }

  const resetFilters = () => {
    setServiceCategory('all')
    setInvitationStatus('all')
    setZipCode('')
    setPage(0)
  }

  const totalPages = prospects.data ? Math.ceil(prospects.data.total / limit) : 0

  if (prospects.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Prospects
          </CardTitle>
          <CardDescription>{prospects.error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Prospective Businesses
          </CardTitle>
          <CardDescription>
            View and manage discovered business prospects
            {prospects.data && ` - ${prospects.data.total} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={invitationStatus} onValueChange={setInvitationStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {INVITATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Filter by ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>

            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>

          {/* Table */}
          {prospects.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading prospects...
            </div>
          ) : prospects.data && prospects.data.prospects.length > 0 ? (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.data.prospects.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{prospect.name}</div>
                            {prospect.formattedPhoneNumber && (
                              <div className="text-xs text-muted-foreground">
                                {prospect.formattedPhoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SERVICE_CATEGORIES.find(c => c.value === prospect.serviceCategory)?.label || prospect.serviceCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {prospect.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{prospect.rating.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">
                                ({prospect.userRatingsTotal})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span>{prospect.city || 'Unknown'}, {prospect.zipCode || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {prospect.distanceFromTarget ? (
                            <span className="text-sm">{prospect.distanceFromTarget.toFixed(1)} mi</span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(prospect.invitationStatus)}>
                            {INVITATION_STATUSES.find(s => s.value === prospect.invitationStatus)?.label || prospect.invitationStatus}
                          </Badge>
                          {!prospect.qualified && (
                            <Badge variant="destructive" className="ml-2">
                              Disqualified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {prospect.qualified && prospect.invitationStatus === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendInvite(prospect)}
                                disabled={sendInvitation.isPending}
                              >
                                <Mail className="mr-1 h-3 w-3" />
                                Send Invite
                              </Button>
                            )}
                            {prospect.qualified && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDisqualify(prospect)}
                                disabled={disqualify.isPending}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({prospects.data.total} total prospects)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No prospects found. Try adjusting your filters or run a discovery scan.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Invitation Dialog */}
      <Dialog open={actionDialog === 'invite'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation email to{' '}
              <span className="font-medium text-foreground">{selectedProspect?.name}</span>?
              <br />
              <br />
              This will send a personalized invitation with a pre-filled signup link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={sendInvitation.isPending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disqualify Dialog */}
      <Dialog open={actionDialog === 'disqualify'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disqualify Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to disqualify{' '}
              <span className="font-medium text-foreground">{selectedProspect?.name}</span>?
              <br />
              <br />
              They will be excluded from future invitation batches.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for disqualification (optional)"
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAction}
              disabled={disqualify.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
