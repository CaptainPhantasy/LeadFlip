"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, LogOut, AlertTriangle } from "lucide-react"

/**
 * Example component demonstrating the ConfirmDialog usage
 * This file serves as documentation and can be deleted in production
 */
export function ConfirmDialogExample() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showWarningDialog, setShowWarningDialog] = useState(false)

  const handleDelete = () => {
    console.log("Item deleted!")
    alert("Item deleted! (This is just an example)")
  }

  const handleLogout = () => {
    console.log("User logged out!")
    alert("Logged out! (This is just an example)")
  }

  const handleProceed = () => {
    console.log("User proceeded with action")
    alert("Proceeding! (This is just an example)")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Dialog Examples</CardTitle>
          <CardDescription>
            Click the buttons below to see different confirmation dialog styles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example 1: Destructive Action */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Destructive Action (Delete)</h3>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Item
            </Button>
            <ConfirmDialog
              open={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={handleDelete}
              title="Delete this item?"
              description="This action cannot be undone. This will permanently delete the item from our servers."
              isDestructive={true}
              confirmText="Delete"
              cancelText="Cancel"
            />
          </div>

          {/* Example 2: Regular Action */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">2. Regular Action (Logout)</h3>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <ConfirmDialog
              open={showLogoutDialog}
              onClose={() => setShowLogoutDialog(false)}
              onConfirm={handleLogout}
              title="Are you sure you want to logout?"
              description="You will need to sign in again to access your account."
              confirmText="Logout"
              cancelText="Stay Logged In"
            />
          </div>

          {/* Example 3: Warning Action */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">3. Warning Action</h3>
            <Button
              variant="default"
              onClick={() => setShowWarningDialog(true)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Proceed with Action
            </Button>
            <ConfirmDialog
              open={showWarningDialog}
              onClose={() => setShowWarningDialog(false)}
              onConfirm={handleProceed}
              title="Important Warning"
              description="This action will make significant changes to your account. Please make sure you understand the consequences before proceeding."
              confirmText="I Understand, Proceed"
              cancelText="Go Back"
            />
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
          <CardDescription>
            Here's how to use the ConfirmDialog component in your code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
            <code>{`import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useState } from "react"

function MyComponent() {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = () => {
    // Your deletion logic here
    console.log("Item deleted!")
  }

  return (
    <>
      <Button onClick={() => setShowConfirm(true)}>
        Delete Item
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This action cannot be undone."
        isDestructive={true}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
