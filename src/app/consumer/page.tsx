import { SiteShell } from "@/components/site-shell"
import { AIInterviewChat } from "@/components/consumer/ai-interview-chat"

export default function ConsumerPage() {
  return (
    <SiteShell maxWidth="7xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Get Help from Local Pros</h1>
          <p className="text-lg text-muted-foreground">
            Chat with our AI assistant to describe your service need - we&apos;ll match you with qualified local professionals
          </p>
        </div>

        <AIInterviewChat />
      </div>
    </SiteShell>
  )
}
