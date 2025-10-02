"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, Phone, LayoutDashboard, DollarSign, Info, Mail, Shield, Settings, Users, FileText, Briefcase } from "lucide-react"
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { trpc } from "@/lib/trpc/client"

// Public navigation items (always visible)
const publicNavItems = [
  { href: "/", label: "Home" },
  { href: "/consumer", label: "Post a Problem", icon: Phone },
  { href: "/for-businesses", label: "For Businesses" },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
]

// Consumer navigation (always visible when signed in)
const consumerNavItems = [
  { href: "/consumer/dashboard", label: "Consumer Dashboard", icon: LayoutDashboard },
]

// Business navigation (only visible if user has business profile)
const businessNavItems = [
  { href: "/business", label: "Business Dashboard", icon: Briefcase },
  { href: "/business/settings", label: "Business Settings", icon: Settings },
]

// Admin navigation items (only visible for admin users)
const adminNavItems = [
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Log", icon: FileText },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useUser()

  // Check if user has admin role (stored in Clerk publicMetadata)
  const isAdmin = user?.publicMetadata?.role === "admin"

  // Check if user has a business profile
  const { data: businessProfile } = trpc.business.getProfile.useQuery(undefined, {
    enabled: !!user, // Only fetch if user is logged in
  })
  const hasBusinessProfile = !!businessProfile

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LeadFlip</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {/* Public nav items */}
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}

            {/* Authenticated nav items */}
            <SignedIn>
              {/* Consumer nav (always visible) */}
              {consumerNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              {/* Business nav (only if has business profile) */}
              {hasBusinessProfile && businessNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              {/* Admin nav items */}
              {isAdmin && adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {item.label}
                </Link>
              ))}
            </SignedIn>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <SignedOut>
              <Button asChild variant="default" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {/* Public nav items */}
                  {publicNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2 text-lg font-medium"
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      <span>{item.label}</span>
                    </Link>
                  ))}

                  {/* Authenticated nav items */}
                  <SignedIn>
                    <div className="border-t border-border pt-4 mt-4">
                      {/* Consumer nav (always visible) */}
                      {consumerNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center space-x-2 text-lg font-medium mb-4"
                        >
                          {item.icon && <item.icon className="h-5 w-5" />}
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      {/* Business nav (only if has business profile) */}
                      {hasBusinessProfile && businessNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center space-x-2 text-lg font-medium mb-4"
                        >
                          {item.icon && <item.icon className="h-5 w-5" />}
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      {/* Admin nav items */}
                      {isAdmin && (
                        <div className="border-t border-border pt-4 mt-4">
                          {adminNavItems.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center space-x-2 text-lg font-medium text-primary mb-4"
                            >
                              {item.icon && <item.icon className="h-5 w-5" />}
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </SignedIn>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
