"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
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
import { trpc } from "@/lib/trpc/client"

const formSchema = z.object({
  problemText: z.string().min(10, "Please describe your problem in at least 10 characters"),
  phone: z.string().regex(/^\+?1?\d{10,}$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
})

type FormValues = z.infer<typeof formSchema>

export function ProblemSubmissionForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemText: "",
      phone: "",
      email: "",
    },
  })

  const submitLead = trpc.lead.submit.useMutation({
    onSuccess: (data) => {
      toast.success('Lead submitted successfully!', {
        description: `Quality Score: ${data.quality_score}/10 | Matches Found: ${data.matches.length} | Status: ${data.status}`
      })
      form.reset()
    },
    onError: (error) => {
      toast.error('Submission failed', {
        description: error.message
      })
    },
  })

  async function onSubmit(values: FormValues) {
    submitLead.mutate({
      problemText: values.problemText,
      contactPhone: values.phone,
      contactEmail: values.email,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="problemText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What do you need help with?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Example: My water heater is leaking and needs urgent repair. Budget around $500."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Be specific about the problem, urgency, and budget for better matches.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
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
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitLead.isPending}>
          {submitLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLead.isPending ? "Submitting..." : "Find Local Businesses"}
        </Button>
      </form>
    </Form>
  )
}
