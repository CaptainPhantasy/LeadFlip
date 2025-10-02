"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone } from "lucide-react"

const formSchema = z.object({
  objective: z
    .string()
    .min(10, "Please provide a detailed objective (at least 10 characters)"),
  scheduledTime: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface RequestAICallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: {
    id: string
    problem_text: string
    service_category?: string
    urgency?: string
    location_zip?: string
  }
}

export function RequestAICallDialog({
  open,
  onOpenChange,
  lead,
}: RequestAICallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: "",
      scheduledTime: "",
    },
  })

  const requestAICall = trpc.business.requestAICall.useMutation({
    onSuccess: () => {
      toast.success("AI call request submitted successfully", {
        description: "The AI will contact the consumer on your behalf",
      })
      form.reset()
      onOpenChange(false)
      setIsSubmitting(false)
    },
    onError: (error) => {
      toast.error("Failed to request AI call", {
        description: error.message,
      })
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: FormData) => {
    setIsSubmitting(true)
    requestAICall.mutate({
      leadId: lead.id,
      objective: data.objective,
      scheduledTime: data.scheduledTime,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Request AI Call
          </DialogTitle>
          <DialogDescription>
            Have our AI assistant call the consumer on your behalf to qualify
            this lead
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-semibold">Lead Details</h4>
          <p className="mb-3 text-sm">{lead.problem_text}</p>
          <div className="flex flex-wrap gap-2">
            {lead.service_category && (
              <Badge variant="outline">{lead.service_category}</Badge>
            )}
            {lead.urgency && <Badge variant="outline">{lead.urgency}</Badge>}
            {lead.location_zip && (
              <Badge variant="outline">{lead.location_zip}</Badge>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Objective</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What should the AI accomplish on this call? (e.g., Confirm appointment time, get more details about the issue, provide quote estimate)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be specific about what information the AI should gather or
                    communicate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to call immediately, or schedule for a specific
                    time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Request AI Call"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
