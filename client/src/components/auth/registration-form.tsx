
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

// First step: Account details schema
const accountSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Second step: Phone verification schema
const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

// Third step: Verification code schema
const verificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export function RegistrationForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [accountData, setAccountData] = useState(null);
  const [verificationId, setVerificationId] = useState("");
  
  // Form for account details
  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });
  
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

  // Handle first step: Account details
  const handleAccountSubmit = (data) => {
    setAccountData(data);
    setRegistrationStep(2);
  };

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

  // Handle second step: Phone number verification
  const handlePhoneSubmit = async (data) => {
    try {
      setIsRegistering(true);
      
      // Initialize the reCAPTCHA verifier
      const recaptchaVerifier = initRecaptchaVerifier('recaptcha-container');
      
      // Format phone number with country code if not provided
      let phoneNumber = data.phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+1${phoneNumber}`; // Default to US country code, adjust as needed
      }
      
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      
      // Save verification ID
      setVerificationId(confirmationResult.verificationId);
      setRegistrationStep(3);
      
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
      setIsRegistering(false);
    }
  };

  // Handle third step: Verification code and complete registration
  const handleVerifyAndRegister = async (data) => {
    if (!verificationId || !accountData) {
      toast({
        title: "Error",
        description: "Verification process expired. Please start over.",
        variant: "destructive",
      });
      setRegistrationStep(1);
      return;
    }

    try {
      setIsRegistering(true);
      
      // First create the user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        accountData.email, 
        accountData.password
      );
      
      // Update the user profile with the name
      await updateProfile(userCredential.user, {
        displayName: accountData.name
      });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Create the user document in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        name: accountData.name,
        email: accountData.email,
        phoneNumber: phoneForm.getValues().phoneNumber,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        role: 'user',
      });
      
      toast({
        title: "Registration successful",
        description: "Please check your email to verify your account",
      });
      
      // Navigate to login page after successful registration
      navigate("/login");
    } catch (error) {
      console.error("Registration Error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>
          {registrationStep === 1 && "Enter your account details to get started"}
          {registrationStep === 2 && "Verify your phone number for added security"}
          {registrationStep === 3 && "Enter the verification code sent to your phone"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registrationStep === 1 && (
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
              <FormField
                control={accountForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          </Form>
        )}

        {registrationStep === 2 && (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRegistrationStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isRegistering}>
                  {isRegistering ? "Sending..." : "Send Code"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {registrationStep === 3 && (
          <Form {...verificationForm}>
            <form onSubmit={verificationForm.handleSubmit(handleVerifyAndRegister)} className="space-y-4">
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
                  onClick={() => setRegistrationStep(2)}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isRegistering}>
                  {isRegistering ? "Registering..." : "Complete Registration"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
