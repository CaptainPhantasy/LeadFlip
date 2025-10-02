import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const testimonials = [
  {
    quote: "Got 3 qualified plumbing leads in the first week. The AI calls are surprisingly natural.",
    author: "Sarah Johnson",
    business: "ABC Plumbing",
    initials: "SJ",
  },
  {
    quote: "No more wasting time on low-quality leads. The AI pre-qualifies them before I even see them.",
    author: "Mike Chen",
    business: "Chen's Lawn Care",
    initials: "MC",
  },
  {
    quote: "As a consumer, I love not having to call 10 businesses. I post once and they come to me.",
    author: "Emily Davis",
    business: "Homeowner",
    initials: "ED",
  },
]

export function Testimonials() {
  return (
    <section className="bg-muted/50 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by Local Businesses
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="border-border">
              <CardContent className="pt-6">
                <p className="mb-4 text-sm leading-relaxed text-foreground/90">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.business}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
