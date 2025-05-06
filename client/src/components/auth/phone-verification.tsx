
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Phone verification schema
const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

// Verification code schema
const verificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export function PhoneVerification({ onSuccess, onCancel }) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationId, setVerificationId] = useState("");

  // Form for phone number
  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  // Form for verification code
  const verificationForm = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  // Initialize recaptcha verifier
  const initRecaptchaVerifier = (containerId) => {
    return new RecaptchaVerifier(auth, containerId, {
      'size': 'normal',
      'callback': () => {
        // reCAPTCHA solved, allow sending verification code
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        toast({
          title: "reCAPTCHA expired",
          description: "Please solve the reCAPTCHA again",
          variant: "destructive",
        });
      }
    });
  };

  // Handle phone verification
  const handleSendVerification = async (data) => {
    try {
      setIsVerifying(true);
      
      // Initialize the reCAPTCHA verifier
      const recaptchaVerifier = initRecaptchaVerifier('recaptcha-container');
      
      // Format phone number with country code if not provided
      let phoneNumber = data.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+1${phoneNumber}`; // Default to US country code, adjust as needed
      }
      
      // Send verification code
      const appVerifier = recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      // Save verification ID
      setVerificationId(confirmationResult.verificationId);
      setShowVerificationInput(true);
      
      toast({
        title: "Verification code sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error) {
      console.error("Phone Verification Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle verification code
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
      setIsVerifying(true);
      
      // Create the credential with the verification ID and code
      const phoneCredential = PhoneAuthProvider.credential(verificationId, data.code);
      
      // Call the success callback with the phone number and credential
      onSuccess({
        phoneNumber: phoneForm.getValues().phoneNumber,
        credential: phoneCredential
      });
      
    } catch (error) {
      console.error("Phone Verification Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify phone number",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showVerificationInput ? (
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
            <div id="recaptcha-container" className="mb-4"></div>
            <div className="flex space-x-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isVerifying}
              >
                {isVerifying ? "Sending..." : "Send Code"}
              </Button>
            </div>
          </form>
        </Form>
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
                    <Input type="text" maxLength={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowVerificationInput(false)}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
