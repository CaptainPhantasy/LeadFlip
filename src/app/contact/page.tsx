"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react"
import { toast } from "sonner"
import { SiteShell } from "@/components/site-shell"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  subject: z.string().min(5, {
    message: "Subject must be at least 5 characters.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
})

const contactInfo = [
  {
    icon: Mail,
    title: "Email",
    content: "support@leadflip.com",
    description: "We typically respond within 24 hours",
  },
  {
    icon: Phone,
    title: "Phone",
    content: "+1 (833) 854-2355",
    description: "Monday-Friday, 9am-5pm EST",
  },
  {
    icon: MapPin,
    title: "Office",
    content: "Carmel, IN 46032",
    description: "Serving local businesses nationwide",
  },
]

export default function ContactPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Mock submission - in production, this would call an API endpoint
    toast.success('Message sent successfully!', {
      description: `We'll respond to ${values.email} as soon as possible.`
    })
    form.reset()
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Get in Touch
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Have questions? We&apos;d love to hear from you. Send us a message and we'll
            respond as soon as possible.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Information */}
          <div className="space-y-6 lg:col-span-1">
            <div>
              <h2 className="mb-4 text-2xl font-bold">Contact Information</h2>
              <p className="text-muted-foreground">
                Reach out through any of these channels, or use the form to send us a
                detailed message.
              </p>
            </div>

            <div className="space-y-4">
              {contactInfo.map((item) => (
                <Card key={item.title}>
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{item.title}</h3>
                      <p className="mb-1 text-sm">{item.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-6">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Looking for support?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                If you&apos;re an existing customer, please log in to your dashboard to
                access priority support and live chat.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="How can we help you?"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us more about your inquiry..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Please provide as much detail as possible
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* FAQ Quick Links */}
            <div className="mt-8 rounded-lg border border-border p-6">
              <h3 className="mb-3 font-semibold">Common Questions</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Before reaching out, you might find your answer in these resources:
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/pricing"
                    className="text-primary hover:underline"
                  >
                    Pricing & Plans FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    className="text-primary hover:underline"
                  >
                    How LeadFlip Works
                  </a>
                </li>
                <li>
                  <span className="text-muted-foreground">
                    Documentation (Coming Soon)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
