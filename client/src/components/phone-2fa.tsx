
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, initRecaptchaVerifier } from "@/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

const verificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export function PhoneTwoFactorAuth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationId, setVerificationId] = useState("");

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const verificationForm = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSendVerification = async (data) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in before enabling 2FA",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnabling(true);
      
      // Initialize the reCAPTCHA verifier
      const recaptchaVerifier = initRecaptchaVerifier('recaptcha-container');
      
      // Format phone number with country code if not provided
      let phoneNumber = data.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+1${phoneNumber}`; // Default to US country code, adjust as needed
      }
      
      // Send verification code
      const appVerifier = recaptchaVerifier;
      const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
      
      // Save verification ID
      setVerificationId(confirmationResult.verificationId);
      setShowVerificationInput(true);
      
      toast({
        title: "Verification code sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error) {
      console.error("Phone 2FA Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerifyCode = async (data) => {
    if (!verificationId) {
      toast({
        title: "Error",
        description: "Verification process expired. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnabling(true);
      
      // Create the credential
      const credential = PhoneAuthProvider.credential(verificationId, data.code);
      
      // Link the credential to the user account
      await linkWithCredential(auth.currentUser, credential);
      
      // Update the user's 2FA status in Firestore
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          phoneAuth2FA: true,
          phoneNumber: phoneForm.getValues().phoneNumber,
        });
      }
      
      toast({
        title: "Success",
        description: "Phone verification successful. SMS 2FA has been enabled.",
      });
      
      setShowVerificationInput(false);
      phoneForm.reset();
      verificationForm.reset();
    } catch (error) {
      console.error("Phone Verification Error:", error);
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>SMS Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security by requiring an SMS verification code when you sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showVerificationInput ? (
          <>
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(handleSendVerification)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div id="recaptcha-container"></div>
                <Button type="submit" disabled={isEnabling}>
                  {isEnabling ? "Sending..." : "Send Verification Code"}
                </Button>
              </form>
            </Form>
          </>
        ) : (
          <Form {...verificationForm}>
            <form onSubmit={verificationForm.handleSubmit(handleVerifyCode)} className="space-y-4">
              <FormField
                control={verificationForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button type="submit" disabled={isEnabling}>
                  {isEnabling ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVerificationInput(false)}
                >
                  Back
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
