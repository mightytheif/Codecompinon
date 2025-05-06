import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  name: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, updateUserProfile, deleteAccount, sendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract the actual name without the user type suffix
  const displayName = user?.displayName?.split("|")[0] || "";
  const userType = user?.displayName?.split("|")[1] || "user";
  const isAdmin = user?.displayName?.split("|").includes("admin") || false;

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: displayName,
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleProfileUpdate = async (data: z.infer<typeof profileSchema>) => {
    try {
      setIsUpdating(true);
      const updates: { displayName?: string; email?: string; password?: string } = {};

      if (data.name !== displayName) {
        updates.displayName = data.name;
      }

      if (data.email !== user?.email) {
        updates.email = data.email;
      }

      if (data.newPassword) {
        updates.password = data.newPassword;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });

        // Clear password fields
        form.setValue("currentPassword", "");
        form.setValue("newPassword", "");
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount();
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleProfileUpdate)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete Account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                You are registered as {isAdmin ? "Administrator" : userType === 'landlord' ? "Landlord" : "Regular User"}
              </p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground">
                  As an administrator, you have access to the admin dashboard where you can manage users and permissions.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user?.emailVerified ? (
                <p className="text-green-600">Your email is verified ✓</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-amber-600">
                    Please verify your email address to secure your account.
                    If you don't receive the email, you can request another one after a short waiting period.
                  </p>
                  <Button
                    onClick={() => sendVerificationEmail()}
                    variant="secondary"
                  >
                    Resend Verification Email
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}