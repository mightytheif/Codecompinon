import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { updateFirestoreRules, getCurrentRules } from "@/lib/update-firestore-rules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileUp, FileDown, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminSettingsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firestoreRules, setFirestoreRules] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First check localStorage for any rules we've saved previously
        const currentRules = getCurrentRules();
        
        if (currentRules) {
          setFirestoreRules(currentRules);
          setLoading(false);
          return;
        }
        
        // If not in localStorage, try to fetch from file
        try {
          const response = await fetch('/firebase-rules.txt');
          
          if (response.ok) {
            const rulesText = await response.text();
            setFirestoreRules(rulesText);
          } else {
            setFirestoreRules("// Failed to load Firestore rules");
            toast({
              title: "Error",
              description: "Failed to load Firestore rules",
              variant: "destructive",
            });
          }
        } catch (fetchError) {
          console.error("Error fetching rules file:", fetchError);
          // Use default rules as fallback
          setFirestoreRules(getCurrentRules());
        }
      } catch (error: any) {
        console.error("Error loading rules:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleUpdateRules = async () => {
    if (!user || !isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only administrators can perform this action",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateFirestoreRules(firestoreRules);
      
      if (result.success) {
        toast({
          title: "Rules Updated",
          description: "Firestore security rules have been updated",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "Failed to update security rules",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating rules:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update rules",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Administrative Area</h1>
        <p className="mb-4">You do not have permission to access this area.</p>
        <Button onClick={() => setLocation("/")}>Return to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
      <p className="text-muted-foreground mb-6">Manage system settings and configurations</p>

      <Tabs defaultValue="security">
        <TabsList className="mb-6">
          <TabsTrigger value="security">Security Rules</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Firestore Security Rules
              </CardTitle>
              <CardDescription>
                Define who can access your database and what operations they can perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={firestoreRules}
                onChange={(e) => setFirestoreRules(e.target.value)}
                className="h-[600px] font-mono text-sm"
                placeholder="// Firestore security rules"
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" disabled={submitting}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" disabled={submitting}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
              <Button 
                onClick={handleUpdateRules} 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Rules
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                This feature will be available in a future update
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The user management system is currently under development. Check back later for updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                This feature will be available in a future update
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                System-wide configuration options will be available here in a future release.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}