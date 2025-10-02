// [2025-10-01 8:35 PM] Agent 1: Fixed server/client import issue by using tRPC endpoints
"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users, Shield, ShieldOff, Eye, AlertCircle, CheckCircle2 } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  email: string | null
  role: string
  created_at: string
  updated_at: string
}

export function UserManagement() {
  const { user: currentUser } = useUser()
  const { toast } = useToast()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionDialog, setActionDialog] = useState<'grant' | 'revoke' | null>(null)

  const utils = trpc.useUtils()
  const users = trpc.admin.getAllUsers.useQuery({ limit: 100, offset: 0 })

  // [2025-10-01 8:35 PM] Agent 1: Use tRPC to get god admin list and check current user
  const godAdminsQuery = trpc.admin.getGodAdmins.useQuery()
  const godAdmins = godAdminsQuery.data?.godAdmins || []
  const isCurrentUserGodAdmin = currentUser ? godAdmins.includes(currentUser.id) : false

  const grantAdmin = trpc.admin.grantAdminRole.useMutation({
    onSuccess: () => {
      toast({
        title: "Admin role granted",
        description: `${selectedUser?.email} is now an admin`,
      })
      setActionDialog(null)
      setSelectedUser(null)
      utils.admin.getAllUsers.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Failed to grant admin role",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const revokeAdmin = trpc.admin.revokeAdminRole.useMutation({
    onSuccess: () => {
      toast({
        title: "Admin role revoked",
        description: `${selectedUser?.email} is no longer an admin`,
      })
      setActionDialog(null)
      setSelectedUser(null)
      utils.admin.getAllUsers.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Failed to revoke admin role",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleGrantAdmin = (user: User) => {
    setSelectedUser(user)
    setActionDialog('grant')
  }

  const handleRevokeAdmin = (user: User) => {
    setSelectedUser(user)
    setActionDialog('revoke')
  }

  const confirmAction = () => {
    if (!selectedUser) return

    if (actionDialog === 'grant') {
      grantAdmin.mutate({ userId: selectedUser.id })
    } else if (actionDialog === 'revoke') {
      revokeAdmin.mutate({ userId: selectedUser.id })
    }
  }

  if (users.isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    )
  }

  if (users.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Users
          </CardTitle>
          <CardDescription>{users.error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions. Total users: {users.data?.total || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isCurrentUserGodAdmin && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <AlertCircle className="mr-2 inline-block h-4 w-4" />
                You need god-level admin access to grant or revoke admin roles.
              </p>
            </div>
          )}

          {users.data && users.data.users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.users.map((user) => {
                  // [2025-10-01 8:35 PM] Agent 1: Check god admin status using the array from tRPC
                  const isUserGodAdmin = godAdmins.includes(user.id)
                  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || isUserGodAdmin

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email || 'No email'}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="ml-2">You</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Badge className="bg-purple-600">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isUserGodAdmin ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            God Admin
                          </Badge>
                        ) : user.role === 'admin' ? (
                          <Badge variant="outline">Database Admin</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Regular</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isCurrentUserGodAdmin && !isUserGodAdmin && (
                            <>
                              {!isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGrantAdmin(user)}
                                  disabled={grantAdmin.isPending}
                                >
                                  <Shield className="mr-1 h-3 w-3" />
                                  Grant Admin
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRevokeAdmin(user)}
                                  disabled={revokeAdmin.isPending}
                                >
                                  <ShieldOff className="mr-1 h-3 w-3" />
                                  Revoke Admin
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              toast({
                                title: "User Details",
                                description: `ID: ${user.id.substring(0, 20)}...`,
                              })
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'grant' ? 'Grant Admin Role' : 'Revoke Admin Role'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'grant' ? (
                <>
                  Are you sure you want to grant admin role to{' '}
                  <span className="font-medium text-foreground">{selectedUser?.email}</span>?
                  <br />
                  <br />
                  They will have access to all admin functions including viewing all leads,
                  businesses, and system settings.
                </>
              ) : (
                <>
                  Are you sure you want to revoke admin role from{' '}
                  <span className="font-medium text-foreground">{selectedUser?.email}</span>?
                  <br />
                  <br />
                  They will lose access to all admin functions immediately.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={grantAdmin.isPending || revokeAdmin.isPending}
              variant={actionDialog === 'revoke' ? 'destructive' : 'default'}
            >
              {actionDialog === 'grant' ? (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Grant Admin
                </>
              ) : (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Revoke Admin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
