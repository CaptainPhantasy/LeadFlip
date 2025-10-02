"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc/client"
import { Search, Loader2, CheckCircle2, AlertCircle, Calendar } from "lucide-react"
import type { ServiceCategory } from "@/types/discovery"

const SERVICE_CATEGORIES: { value: ServiceCategory | 'all'; label: string }[] = [
  { value: 'all', label: '🎯 All Categories (Scan All 11)' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'landscaping', label: 'Landscaping/Lawn Care' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'painting', label: 'Painting' },
  { value: 'carpentry', label: 'Carpentry/Handyman' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'general_contractor', label: 'General Contractors' },
]

export function ScanTrigger() {
  const [zipCode, setZipCode] = useState("")
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | "all" | "">("")
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [resultMessage, setResultMessage] = useState("")
  const [scanProgress, setScanProgress] = useState("")

  const triggerScan = trpc.discovery.triggerScan.useMutation({
    onSuccess: (data) => {
      setScanStatus('success')
      const message = data.result
        ? `✅ Scan complete! Found ${data.result.totalResults} businesses, added ${data.result.discovered} new prospects (${data.result.duplicates} duplicates, ${data.result.filteredOut} filtered out)`
        : 'Scan completed successfully!'
      setResultMessage(message)
      setScanProgress("")
      // Reset form after 5 seconds
      setTimeout(() => {
        setScanStatus('idle')
        setZipCode("")
        setServiceCategory("")
        setResultMessage("")
      }, 5000)
    },
    onError: (error) => {
      setScanStatus('error')
      setResultMessage(error.message || 'Failed to scan. Please try again.')
      setScanProgress("")
      setTimeout(() => {
        setScanStatus('idle')
        setResultMessage("")
      }, 5000)
    }
  })

  const handleScan = async () => {
    if (!zipCode || !serviceCategory) {
      setResultMessage("Please select both ZIP code and service category")
      setScanStatus('error')
      setTimeout(() => {
        setScanStatus('idle')
        setResultMessage("")
      }, 3000)
      return
    }

    setScanStatus('scanning')

    // If "all" categories selected, run scans sequentially
    if (serviceCategory === 'all') {
      const categories = SERVICE_CATEGORIES.filter(c => c.value !== 'all').map(c => c.value) as ServiceCategory[]
      let totalDiscovered = 0
      let totalResults = 0

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i]
        setScanProgress(`Scanning ${i + 1}/${categories.length}: ${SERVICE_CATEGORIES.find(c => c.value === cat)?.label}...`)

        try {
          const result = await triggerScan.mutateAsync({
            zipCode,
            serviceCategory: cat,
          })

          if (result.result) {
            totalDiscovered += result.result.discovered
            totalResults += result.result.totalResults
          }
        } catch (error) {
          console.error(`Failed to scan ${cat}:`, error)
        }
      }

      setScanStatus('success')
      setResultMessage(`✅ All categories scanned! Found ${totalResults} total businesses, added ${totalDiscovered} new prospects`)
      setScanProgress("")

      setTimeout(() => {
        setScanStatus('idle')
        setZipCode("")
        setServiceCategory("")
        setResultMessage("")
      }, 5000)
    } else {
      // Single category scan
      triggerScan.mutate({
        zipCode,
        serviceCategory: serviceCategory as ServiceCategory,
      })
    }
  }

  const isScanning = scanStatus === 'scanning'
  const canTrigger = zipCode.length === 5 && serviceCategory !== ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Discovery Scan
        </CardTitle>
        <CardDescription>
          Manually trigger a business discovery scan for a specific market and service category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="zip-code">ZIP Code</Label>
            <Input
              id="zip-code"
              placeholder="46032"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.slice(0, 5))}
              maxLength={5}
              disabled={isScanning}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-category">Service Category</Label>
            <Select
              value={serviceCategory}
              onValueChange={(value) => setServiceCategory(value as ServiceCategory | 'all')}
              disabled={isScanning}
            >
              <SelectTrigger id="service-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleScan}
          disabled={!canTrigger || isScanning}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {scanProgress || (serviceCategory === 'all' ? 'Scanning all categories...' : 'Scanning...')}
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              {serviceCategory === 'all' ? 'Run All Category Scans' : 'Run Discovery Scan'}
            </>
          )}
        </Button>

        {/* Progress Message */}
        {scanProgress && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{scanProgress}</span>
          </div>
        )}

        {/* Status Messages */}
        {scanStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{resultMessage}</span>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{resultMessage}</span>
          </div>
        )}

        {/* Info Badge */}
        {scanStatus === 'idle' && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <Calendar className="h-4 w-4" />
            <span>Automatic scans run weekly. Manual scans are for testing or urgent needs.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
