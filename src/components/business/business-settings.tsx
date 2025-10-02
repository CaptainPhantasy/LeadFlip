"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Loader2, Settings } from "lucide-react"

const profileFormSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  serviceCategories: z.string().min(1, "Select at least one service category"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
  description: z.string().optional(),
  priceTier: z.enum(["budget", "standard", "premium"]),
  offersEmergencyService: z.boolean(),
  isLicensed: z.boolean(),
  isInsured: z.boolean(),
  notificationsPaused: z.boolean(),
})

type ProfileFormData = z.infer<typeof profileFormSchema>

const SERVICE_CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "carpentry",
  "painting",
  "landscaping",
  "roofing",
  "cleaning",
  "pest_control",
  "appliance_repair",
  "general_contractor",
]

export function BusinessSettings() {
  const profile = trpc.business.getProfile.useQuery()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      serviceCategories: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      description: "",
      priceTier: "standard",
      offersEmergencyService: false,
      isLicensed: false,
      isInsured: false,
      notificationsPaused: false,
    },
    values: profile.data
      ? {
          name: profile.data.name || "",
          email: profile.data.email || "",
          phoneNumber: profile.data.phone_number || "",
          serviceCategories:
            profile.data.service_categories?.join(", ") || "",
          address: profile.data.address || "",
          city: profile.data.city || "",
          state: profile.data.state || "",
          zipCode: profile.data.zip_code || "",
          description: profile.data.description || "",
          priceTier: profile.data.price_tier || "standard",
          offersEmergencyService: profile.data.offers_emergency_service || false,
          isLicensed: profile.data.is_licensed || false,
          isInsured: profile.data.is_insured || false,
          notificationsPaused: profile.data.notifications_paused || false,
        }
      : undefined,
  })

  const updateProfile = trpc.business.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully")
      profile.refetch()
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      })
    },
  })

  const registerBusiness = trpc.business.register.useMutation({
    onSuccess: (data) => {
      console.log('[BusinessSettings] Register success:', data)
      toast.success("Business profile created successfully!")
      profile.refetch()
    },
    onError: (error) => {
      console.error('[BusinessSettings] Register error:', error)
      toast.error("Failed to create profile", {
        description: error.message,
      })
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    console.log('[BusinessSettings] Form submitted with data:', data)

    const serviceCategories = data.serviceCategories
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    console.log('[BusinessSettings] Parsed service categories:', serviceCategories)
    console.log('[BusinessSettings] Profile exists:', !!profile.data)

    // If no profile exists, use register endpoint
    if (!profile.data) {
      // For new profiles, we need lat/long. For now, use a default location
      // TODO: Add geocoding to convert address to lat/long
      console.log('[BusinessSettings] Calling registerBusiness mutation')
      registerBusiness.mutate({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        serviceCategories,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: 39.8333, // Default to Indianapolis, IN
        longitude: -86.25,
        description: data.description,
        priceTier: data.priceTier,
        offersEmergencyService: data.offersEmergencyService,
        isLicensed: data.isLicensed,
        isInsured: data.isInsured,
      })
    } else {
      console.log('[BusinessSettings] Calling updateProfile mutation')
      // Update existing profile
      updateProfile.mutate({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        serviceCategories,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        description: data.description,
        priceTier: data.priceTier,
        offersEmergencyService: data.offersEmergencyService,
        isLicensed: data.isLicensed,
        isInsured: data.isInsured,
        notificationsPaused: data.notificationsPaused,
      })
    }
  }

  if (profile.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (profile.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Profile
          </CardTitle>
          <CardDescription>{profile.error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Business Settings</h1>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('[BusinessSettings] Form validation errors:', errors)
            toast.error("Please fix the errors in the form", {
              description: Object.values(errors).map(e => e.message).join(', ')
            })
          })}
          className="space-y-6"
        >
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your business profile and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Plumbing Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@business.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell customers about your business..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Your business address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Indianapolis" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="IN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="46032" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Services & Pricing</CardTitle>
              <CardDescription>
                Configure what services you offer and your pricing tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="serviceCategories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Categories</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="plumbing, electrical, hvac (comma-separated)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Available: {SERVICE_CATEGORIES.join(", ")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Tier</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your pricing tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="budget">
                          Budget - Lower cost services
                        </SelectItem>
                        <SelectItem value="standard">
                          Standard - Mid-range pricing
                        </SelectItem>
                        <SelectItem value="premium">
                          Premium - High-end services
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="offersEmergencyService"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Emergency Services
                        </FormLabel>
                        <FormDescription>
                          Do you offer 24/7 emergency service?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isLicensed"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Licensed</FormLabel>
                        <FormDescription>
                          Are you licensed in your service area?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isInsured"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Insured</FormLabel>
                        <FormDescription>
                          Do you carry liability insurance?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage when you receive lead notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notificationsPaused"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Pause Notifications
                      </FormLabel>
                      <FormDescription>
                        Temporarily stop receiving new lead notifications
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending || registerBusiness.isPending}>
              {(updateProfile.isPending || registerBusiness.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {profile.data ? "Saving..." : "Creating Profile..."}
                </>
              ) : (
                profile.data ? "Save Changes" : "Create Business Profile"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
