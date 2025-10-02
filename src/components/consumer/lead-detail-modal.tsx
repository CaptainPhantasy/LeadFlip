"use client"

import { trpc } from "@/lib/trpc/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  Building2,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface LeadDetailModalProps {
  leadId: string
  open: boolean
  onClose: () => void
}

export function LeadDetailModal({ leadId, open, onClose }: LeadDetailModalProps) {
  const [requestingCallback, setRequestingCallback] = useState<string | null>(null)

  // Fetch lead details
  const lead = trpc.lead.getById.useQuery(
    { leadId },
    { enabled: open && !!leadId }
  )

  // Fetch matches
  const matches = trpc.lead.getMatches.useQuery(
    { leadId },
    { enabled: open && !!leadId }
  )

  // Request callback mutation
  const requestCallbackMutation = trpc.lead.requestCallback.useMutation({
    onSuccess: () => {
      toast.success("Callback request submitted successfully!")
      setRequestingCallback(null)
    },
    onError: (error) => {
      toast.error(error.message || "Failed to request callback")
      setRequestingCallback(null)
    },
  })

  const handleRequestCallback = (businessId: string) => {
    setRequestingCallback(businessId)
    requestCallbackMutation.mutate({
      leadId,
      businessId,
    })
  }

  if (lead.isLoading || matches.isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="text-center py-12">Loading lead details...</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (lead.error || matches.error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="text-center py-12 text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p>Error loading lead details</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const leadData = lead.data
  const matchesData = matches.data || []
  const classifiedData = leadData?.classified_data as any

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription>
            View your submitted problem and matched businesses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Problem Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Your Problem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{leadData?.problem_text}</p>
            </CardContent>
          </Card>

          {/* Classification & Quality Score */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">
                    {leadData?.quality_score || 'N/A'}
                  </div>
                  <span className="text-muted-foreground">/10</span>
                </div>
                <Badge
                  className="mt-2"
                  variant={
                    (leadData?.quality_score || 0) >= 7
                      ? 'default'
                      : (leadData?.quality_score || 0) >= 5
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {(leadData?.quality_score || 0) >= 7
                    ? 'High Quality'
                    : (leadData?.quality_score || 0) >= 5
                    ? 'Medium Quality'
                    : 'Low Quality'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    leadData?.status === 'matched'
                      ? 'default'
                      : leadData?.status === 'processing'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {leadData?.status || 'pending'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {new Date(leadData?.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Classification Details */}
          {classifiedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Classification Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {classifiedData.service_category && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Service</p>
                        <p className="text-sm font-medium capitalize">
                          {classifiedData.service_category}
                        </p>
                      </div>
                    </div>
                  )}
                  {classifiedData.urgency && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Urgency</p>
                        <p className="text-sm font-medium capitalize">
                          {classifiedData.urgency}
                        </p>
                      </div>
                    </div>
                  )}
                  {classifiedData.location_zip && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium">
                          {classifiedData.location_zip}
                        </p>
                      </div>
                    </div>
                  )}
                  {(classifiedData.budget_min || classifiedData.budget_max) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-medium">
                          ${classifiedData.budget_min || 0} - $
                          {classifiedData.budget_max || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched Businesses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Matched Businesses ({matchesData.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchesData.length > 0 ? (
                <div className="space-y-4">
                  {matchesData.map((match: any) => (
                    <Card key={match.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">
                              {match.businesses?.name || 'Unknown Business'}
                            </h4>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {match.businesses?.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{match.businesses.rating}/5</span>
                                </div>
                              )}
                              {match.businesses?.years_in_business && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {match.businesses.years_in_business} years
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Match Score: {(match.confidence_score * 100).toFixed(0)}%
                              </Badge>
                              <Badge
                                variant={
                                  match.status === 'accepted'
                                    ? 'default'
                                    : match.status === 'pending'
                                    ? 'secondary'
                                    : 'outline'
                                }
                                className="text-xs"
                              >
                                {match.status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRequestCallback(match.business_id)}
                            disabled={
                              requestingCallback === match.business_id ||
                              match.status === 'declined'
                            }
                          >
                            <Phone className="mr-1 h-3 w-3" />
                            {requestingCallback === match.business_id
                              ? 'Requesting...'
                              : 'Request Callback'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No businesses matched yet. We're working on finding the best matches
                    for you.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
