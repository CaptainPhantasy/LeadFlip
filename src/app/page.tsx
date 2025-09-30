export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">LeadFlip</h1>
        <p className="text-xl text-muted-foreground">
          AI-Powered Lead Marketplace
        </p>
        <div className="rounded-lg border p-6 max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground">
            LeadFlip is a Claude Agent SDK-powered reverse marketplace that connects
            consumers with local service businesses through intelligent lead matching
            and AI-powered calling.
          </p>
        </div>
      </main>
    </div>
  );
}
