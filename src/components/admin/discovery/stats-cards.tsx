"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, MousePointerClick, CheckCircle2 } from "lucide-react"
import type { DiscoveryStats } from "@/types/discovery"

interface StatsCardsProps {
  stats: DiscoveryStats;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
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

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Discovered"
        value={stats.totalDiscovered}
        icon={Users}
        description="Total businesses found"
        color="blue"
      />
      <StatCard
        title="Invited"
        value={stats.totalInvited}
        icon={Mail}
        description="Invitations sent"
        color="purple"
      />
      <StatCard
        title="Clicked"
        value={stats.totalClicked}
        icon={MousePointerClick}
        description="Invitation links clicked"
        color="amber"
      />
      <StatCard
        title="Activated"
        value={stats.totalActivated}
        icon={CheckCircle2}
        description="Businesses joined"
        color="green"
      />
    </div>
  )
}

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  description: string;
  color: 'blue' | 'purple' | 'amber' | 'green';
}

function StatCard({ title, value, icon: Icon, description, color }: StatCardProps) {
  const iconColorClass = {
    blue: "text-blue-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    green: "text-green-600",
  }[color]

  const bgColorClass = {
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    amber: "bg-amber-50",
    green: "bg-green-50",
  }[color]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-full p-2 ${bgColorClass}`}>
          <Icon className={`h-4 w-4 ${iconColorClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(value || 0).toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
