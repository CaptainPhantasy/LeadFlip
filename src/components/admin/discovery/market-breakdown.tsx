"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Wrench } from "lucide-react"
import type { DiscoveryStats } from "@/types/discovery"

interface MarketBreakdownProps {
  stats: DiscoveryStats;
  isLoading?: boolean;
}

export function MarketBreakdown({ stats, isLoading }: MarketBreakdownProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* By Market */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            By Market
          </CardTitle>
          <CardDescription>
            Breakdown by ZIP code and city
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(stats.byMarket || []).length > 0 ? (
            <div className="space-y-4">
              {(stats.byMarket || []).map((market) => (
                <div key={market.zipCode} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {market.name} ({market.zipCode})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {market.discovered} discovered, {market.invited} invited
                      </div>
                    </div>
                    <Badge variant={market.activated > 0 ? "default" : "secondary"}>
                      {market.activated} activated
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${market.discovered > 0 ? (market.activated / market.discovered) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No markets scanned yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Service Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            By Service Category
          </CardTitle>
          <CardDescription>
            Breakdown by business type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(stats.byServiceCategory || []).length > 0 ? (
            <div className="space-y-4">
              {(stats.byServiceCategory || []).map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.discovered} discovered, {category.invited} invited
                      </div>
                    </div>
                    <Badge variant={category.activated > 0 ? "default" : "secondary"}>
                      {category.activated} activated
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${category.discovered > 0 ? (category.activated / category.discovered) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No service categories scanned yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
