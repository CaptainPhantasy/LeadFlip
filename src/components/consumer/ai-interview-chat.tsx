"use client"

/**
 * AI Interview Chat Component
 *
 * Beautiful streaming conversational interface for AI-powered problem interviews
 * Features:
 * - Real-time streaming responses with typing indicators
 * - Visible "thinking" blocks for transparency
 * - Auto-scroll to latest message
 * - Extracted info preview panel
 * - Completion detection with submit button
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Sparkles, Brain, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
}

export function AIInterviewChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [currentThinking, setCurrentThinking] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [extractedInfo, setExtractedInfo] = useState<any>({})
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const startInterview = trpc.interview.startInterview.useMutation({
    onSuccess: (data) => {
      setSessionId(data.session_id)
      setMessages([{
        role: 'assistant',
        content: data.greeting,
        timestamp: new Date(),
      }])
    },
    onError: (error) => {
      console.error('Failed to start interview:', error)
      setMessages([{
        role: 'assistant',
        content: `Error: ${error.message}. Please refresh the page and try again.`,
        timestamp: new Date(),
      }])
    },
  })

  const sendMessageSync = trpc.interview.sendMessageSync.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.text,
          thinking: data.thinking,
          timestamp: new Date(),
        },
      ])
      setExtractedInfo(data.extracted_info)
      setIsComplete(data.is_complete)
      setIsTyping(false)
      setStreamingText('')
      setCurrentThinking('')
    },
    onError: (error) => {
      console.error('Failed to send message:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message}. Please try again.`,
          timestamp: new Date(),
        },
      ])
      setIsTyping(false)
    },
  })

  const finalizeInterview = trpc.interview.finalizeInterview.useMutation({
    onSuccess: (data) => {
      // Redirect to lead confirmation page
      window.location.href = `/consumer/leads/${data.lead_id}`
    },
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Start interview on mount
  useEffect(() => {
    if (!sessionId && !startInterview.isPending) {
      console.log('[AIInterview] Starting new interview session...')
      startInterview.mutate({}, {
        onSuccess: (data) => {
          console.log('[AIInterview] Session started:', data.session_id)
        },
        onError: (error) => {
          console.error('[AIInterview] Failed to start session:', error)
        }
      })
    }
  }, [sessionId, startInterview])

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId || isTyping) {
      console.log('[AIInterview] Cannot send:', { hasInput: !!input.trim(), hasSession: !!sessionId, isTyping })
      return
    }

    const userMessage = input.trim()
    console.log('[AIInterview] Sending message:', userMessage)
    setInput('')
    setIsTyping(true)
    setCurrentThinking('')
    setStreamingText('')

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      },
    ])

    // Use non-streaming version for now (subscriptions require WebSocket setup)
    // TODO: Implement streaming via WebSockets for real-time experience
    console.log('[AIInterview] Calling sendMessageSync with sessionId:', sessionId)
    sendMessageSync.mutate({
      sessionId,
      message: userMessage,
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFinalize = () => {
    if (!sessionId) return
    finalizeInterview.mutate({ sessionId })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Chat Panel */}
      <Card className="lg:col-span-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Service Request Assistant
          </CardTitle>
          <CardDescription>
            I'll help you describe your service need in the most complete way possible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg p-4',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  )}
                >
                  {/* Thinking Block (only for assistant) */}
                  {msg.thinking && (
                    <div className="mb-3 p-3 bg-muted/50 rounded border-l-4 border-primary/50">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                        <Brain className="h-3 w-3 mt-0.5" />
                        <span className="font-semibold">Thinking...</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                        {msg.thinking}
                      </p>
                    </div>
                  )}

                  {/* Message Content */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Timestamp */}
                  <p className="text-xs mt-2 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Streaming Response */}
            {isTyping && (streamingText || currentThinking) && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-card border border-border">
                  {/* Current Thinking */}
                  {currentThinking && (
                    <div className="mb-3 p-3 bg-muted/50 rounded border-l-4 border-primary/50">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                        <Brain className="h-3 w-3 mt-0.5 animate-pulse" />
                        <span className="font-semibold">Thinking...</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                        {currentThinking}
                      </p>
                    </div>
                  )}

                  {/* Streaming Text */}
                  {streamingText && (
                    <p className="whitespace-pre-wrap">{streamingText}</p>
                  )}

                  {/* Typing Indicator */}
                  {!streamingText && !currentThinking && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isComplete
                  ? 'Need to make a change? Just type here...'
                  : 'Type your message...'
              }
              disabled={isTyping || !sessionId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping || !sessionId}
              size="icon"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Completion Notice */}
          {isComplete && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-primary">Ready to submit!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I have all the information needed to connect you with qualified service
                    professionals. Need to make a correction? Just type it above.
                  </p>
                  <Button
                    onClick={handleFinalize}
                    className="mt-3"
                    disabled={finalizeInterview.isPending}
                  >
                    {finalizeInterview.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Service Request'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Info Panel */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Extracted Information</CardTitle>
          <CardDescription>Live preview of what I understand so far</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Category */}
          {extractedInfo.service_category && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Service Type</p>
              <Badge variant="default">{extractedInfo.service_category}</Badge>
            </div>
          )}

          {/* Urgency */}
          {extractedInfo.urgency && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Urgency</p>
              <Badge
                variant={
                  extractedInfo.urgency === 'emergency'
                    ? 'destructive'
                    : extractedInfo.urgency === 'urgent'
                    ? 'default'
                    : 'secondary'
                }
              >
                {extractedInfo.urgency}
              </Badge>
            </div>
          )}

          {/* Location */}
          {extractedInfo.location_zip && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Location</p>
              <p className="text-sm">
                {extractedInfo.location_city && extractedInfo.location_state
                  ? `${extractedInfo.location_city}, ${extractedInfo.location_state} `
                  : ''}
                {extractedInfo.location_zip}
              </p>
            </div>
          )}

          {/* Budget */}
          {(extractedInfo.budget_min || extractedInfo.budget_max) && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Budget</p>
              <p className="text-sm">
                {extractedInfo.budget_min && extractedInfo.budget_max
                  ? `$${extractedInfo.budget_min} - $${extractedInfo.budget_max}`
                  : extractedInfo.budget_max
                  ? `Up to $${extractedInfo.budget_max}`
                  : `Starting from $${extractedInfo.budget_min}`}
              </p>
            </div>
          )}

          {/* Contact Info */}
          {(extractedInfo.contact_phone || extractedInfo.contact_email) && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Contact</p>
              <div className="space-y-1">
                {extractedInfo.contact_phone && (
                  <p className="text-sm">{extractedInfo.contact_phone}</p>
                )}
                {extractedInfo.contact_email && (
                  <p className="text-sm">{extractedInfo.contact_email}</p>
                )}
              </div>
            </div>
          )}

          {/* Problem Description */}
          {extractedInfo.problem_description && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground line-clamp-4">
                {extractedInfo.problem_description}
              </p>
            </div>
          )}

          {/* Symptoms */}
          {extractedInfo.symptoms && extractedInfo.symptoms.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {extractedInfo.symptoms.map((symptom: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suspected Causes */}
          {extractedInfo.suspected_causes && extractedInfo.suspected_causes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                Potential Causes
              </p>
              <div className="flex flex-wrap gap-1">
                {extractedInfo.suspected_causes.map((cause: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {cause}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Frequency/Conditions */}
          {(extractedInfo.frequency || extractedInfo.conditions) && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Pattern</p>
              <p className="text-sm">
                {extractedInfo.frequency && (
                  <span className="block">Frequency: {extractedInfo.frequency}</span>
                )}
                {extractedInfo.conditions && (
                  <span className="block">Occurs: {extractedInfo.conditions}</span>
                )}
              </p>
            </div>
          )}

          {/* Key Requirements */}
          {extractedInfo.key_requirements && extractedInfo.key_requirements.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                Key Requirements
              </p>
              <div className="flex flex-wrap gap-1">
                {extractedInfo.key_requirements.map((req: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {req}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Completeness Indicator */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Interview Progress</span>
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isComplete
                ? 'All required information collected'
                : 'Gathering information...'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
