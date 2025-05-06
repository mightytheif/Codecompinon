import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const otpSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export function EmailTwoFactorAuth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);

  const form = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSendOTP = async () => {
    if (!user || !user.emailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email address before enabling 2FA",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnabling(true);
      // Get the current user's ID token
      const idToken = await user.getIdToken();

      const response = await fetch("/api/auth/send-2fa-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.message || "Failed to send verification code");
      }

      setShowOTPInput(true);
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code. For testing, check the server console logs.",
      });
    } catch (error: any) {
      console.error("2FA Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof otpSchema>) => {
    try {
      setIsEnabling(true);
      // Get the current user's ID token
      const idToken = await user.getIdToken();

      const response = await fetch("/api/auth/verify-2fa-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code: data.code }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.details || responseData.message || "Failed to verify code");
      }

      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled",
      });
      setShowOTPInput(false);
      form.reset();
    } catch (error: any) {
      console.error("2FA Verification Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security by requiring email verification when signing in from a new device
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showOTPInput ? (
          <div className="space-y-4">
            <p className="text-sm">
              When enabled, you'll need to verify your identity through your email when signing in from a new device.
            </p>
            <Button
              onClick={handleSendOTP}
              disabled={isEnabling || !user?.emailVerified}
            >
              {isEnabling ? "Enabling..." : "Enable Email 2FA"}
            </Button>
            {!user?.emailVerified && (
              <p className="text-sm text-amber-600">
                Please verify your email address first before enabling two-factor authentication.
              </p>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input type="text" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOTPInput(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isEnabling}>
                  {isEnabling ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}