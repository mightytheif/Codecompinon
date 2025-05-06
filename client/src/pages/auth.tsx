import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isLandlord: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, login, register, resetPassword } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      isLandlord: false,
      isAdmin: false,
    },
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login(data.email, data.password);
    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "Login failed. Please try again.";

      switch (errorCode) {
        case 'auth/invalid-email':
          errorMessage = "The email address is not valid.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password.";
          break;
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: z.infer<typeof registerSchema>) => {
    try {
      // If trying to register as admin, verify email first
      if (data.isAdmin && !data.email.toLowerCase().endsWith('@sakany.com')) {
        toast({
          title: "Registration Error",
          description: "Admin accounts must use a @sakany.com email address",
          variant: "destructive",
        });
        return;
      }

      // Register the user
      await register(data.name, data.email, data.password, data.isLandlord, data.isAdmin);

      toast({
        title: "Success",
        description: "Account created successfully",
      });

    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "Registration failed. Please try again.";

      switch (errorCode) {
        case 'auth/email-already-in-use':
          errorMessage = "This email is already registered.";
          break;
        case 'auth/invalid-email':
          errorMessage = "The email address is not valid.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "Email/password accounts are not enabled.";
          break;
        case 'auth/weak-password':
          errorMessage = "The password is too weak.";
          break;
      }

      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.getValues("email");
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetPassword(email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(handleLogin)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
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
                      control={loginForm.control}
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
                    <div className="flex justify-between items-center">
                      <Button type="submit" className="w-[48%]">
                        Login
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-[48%]"
                        onClick={handleForgotPassword}
                      >
                        Forgot Password?
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(handleRegister)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
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
                      control={registerForm.control}
                      name="isLandlord"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I am a landlord
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Register as Administrator
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Create Account
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-orange-50 items-center justify-center p-12">
        <div className="max-w-lg">
          <img
            src="/assets/logo.png"
            alt="SAKANY"
            className="h-16 w-auto mb-8"
            onError={(e) => {
              e.currentTarget.src = "/assets/fallback-logo.svg";
              console.error("Error loading logo image");
            }}
          />
          <h1 className="text-4xl font-bold mb-4">
            Find Your Perfect Home
          </h1>
          <p className="text-lg text-muted-foreground">
            Join SAKANY to discover properties tailored to your lifestyle. Whether you're new to the city or looking for a change, we'll help you find the perfect place to call home.
          </p>
        </div>
      </div>
    </div>
  );
}