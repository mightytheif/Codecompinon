import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, RefreshCw, Shield } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CheckAdminStatus() {
  const [, navigate] = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [adminCheckResults, setAdminCheckResults] = useState<{
    idToken: boolean;
    customClaims: boolean;
    sakanyEmail: boolean;
    displayName: boolean;
  }>({
    idToken: false,
    customClaims: false,
    sakanyEmail: false,
    displayName: false,
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      // Get the current ID token result with all the claims
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      
      // Extract the user information
      const email = auth.currentUser.email || '';
      const displayName = auth.currentUser.displayName || '';
      
      // Check all admin detection methods
      const hasAdminClaim = idTokenResult.claims.admin === true;
      const hasSakanyEmail = email.toLowerCase().endsWith('@sakany.com');
      const hasAdminInDisplayName = displayName.split('|').includes('admin');
      
      // Set the token details for display
      setTokenDetails({
        uid: auth.currentUser.uid,
        email,
        displayName,
        claims: idTokenResult.claims,
        tokenIssued: new Date(idTokenResult.issuedAtTime).toLocaleString(),
        tokenExpires: new Date(idTokenResult.expirationTime).toLocaleString(),
      });
      
      // Set the results of all admin checks
      setAdminCheckResults({
        idToken: hasAdminClaim,
        customClaims: hasAdminClaim, // Same as idToken since that's where we get claims
        sakanyEmail: hasSakanyEmail,
        displayName: hasAdminInDisplayName
      });
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Error",
        description: `Failed to check admin status: ${error.message}`,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      setRefreshing(true);
      
      if (!auth.currentUser) {
        toast({
          title: "Error",
          description: "You must be logged in to refresh your token",
          variant: "destructive",
        });
        setRefreshing(false);
        return;
      }
      
      // Force token refresh
      await auth.currentUser.getIdToken(true);
      
      toast({
        title: "Token Refreshed",
        description: "Your authentication token has been refreshed",
      });
      
      // Re-check the admin status with the new token
      await checkAdminStatus();
      
      setRefreshing(false);
    } catch (error: any) {
      console.error("Error refreshing token:", error);
      toast({
        title: "Error",
        description: `Failed to refresh token: ${error.message}`,
        variant: "destructive",
      });
      setRefreshing(false);
    }
  };

  const goToDashboard = () => {
    navigate("/admin/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Not Authenticated</CardTitle>
            <CardDescription>
              You must be logged in to check admin status
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Admin Status Check</h1>
        <Button variant="outline" onClick={goToDashboard} className="ml-auto">
          Back to Dashboard
        </Button>
        <Button variant="secondary" onClick={refreshToken} disabled={refreshing}>
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Token
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Status
            </CardTitle>
            <CardDescription>
              Overall status: {isAdmin ? "Administrator" : "Not an Administrator"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Admin Custom Claim</span>
                {adminCheckResults.customClaims ? (
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" /> Not Set
                  </Badge>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span>@sakany.com Email</span>
                {adminCheckResults.sakanyEmail ? (
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" /> Not Found
                  </Badge>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span>Admin in Display Name</span>
                {adminCheckResults.displayName ? (
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" /> Not Found
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              You need at least one of these admin indicators to have admin privileges.
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Details</CardTitle>
            <CardDescription>
              Your current authentication token information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">User ID</h3>
                <p className="text-sm text-muted-foreground break-all">{tokenDetails?.uid}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">{tokenDetails?.email}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Display Name</h3>
                <p className="text-sm text-muted-foreground">{tokenDetails?.displayName}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Token Issued</h3>
                <p className="text-sm text-muted-foreground">{tokenDetails?.tokenIssued}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Token Expires</h3>
                <p className="text-sm text-muted-foreground">{tokenDetails?.tokenExpires}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium">Custom Claims</h3>
                <pre className="text-xs bg-muted p-2 rounded-md mt-1 overflow-auto">
                  {JSON.stringify(tokenDetails?.claims, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}