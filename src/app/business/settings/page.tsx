import { SiteShell } from "@/components/site-shell"
import { BusinessSettings } from "@/components/business/business-settings"

export default function BusinessSettingsPage() {
  return (
    <SiteShell maxWidth="2xl">
      <BusinessSettings />
    </SiteShell>
  )
}
