import { ProspectsTable } from "@/components/admin/discovery/prospects-table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProspectsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/discovery">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Discovery Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Business Prospects</h1>
        <p className="mt-2 text-muted-foreground">
          View, filter, and manage discovered businesses. Send invitations or disqualify prospects.
        </p>
      </div>

      <ProspectsTable />
    </div>
  )
}
