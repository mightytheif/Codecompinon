import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { deleteUser, getAuth } from "firebase/auth";

interface User {
  uid: string;
  email: string;
  displayName: string;
  canListProperties: boolean;
  isLandlord: boolean;
  createdAt?: string;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, isAdmin, deleteAccount } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }

    const fetchUsers = async () => {
      try {
        setError(null);
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(usersQuery);
        const userData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as User));
        setUsers(userData);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        let errorMessage = "Failed to fetch users";

        if (error.code === "permission-denied") {
          errorMessage = "You don't have permission to access user data. Please verify your admin privileges.";
        }

        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, navigate, toast]);

  const togglePropertyListing = async (userId: string, currentValue: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        canListProperties: !currentValue
      });

      setUsers(users.map(user =>
        user.uid === userId
          ? { ...user, canListProperties: !currentValue }
          : user
      ));

      toast({
        title: "Success",
        description: `Property listing permission ${!currentValue ? 'granted' : 'revoked'}`,
      });
    } catch (error: any) {
      console.error("Error updating user permissions:", error);
      let errorMessage = "Failed to update user permissions";

      if (error.code === "permission-denied") {
        errorMessage = "You don't have permission to update user permissions. Please verify your admin privileges.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsDeleting(true);
      setSelectedUserId(userId);

      // Get user reference from Firestore
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      try {
        // Get the current user's token for authentication
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("You must be logged in to delete users");
        }
        
        // Force a token refresh to ensure we have the latest custom claims
        const token = await currentUser.getIdToken(true);
        
        // Get token result to check for admin claims directly
        const idTokenResult = await currentUser.getIdTokenResult();
        const hasAdminClaim = idTokenResult.claims.admin === true;
        
        console.log("Admin check before deleting user:", {
          uid: currentUser.uid,
          email: currentUser.email,
          hasAdminClaim,
          customClaims: idTokenResult.claims
        });
        
        // If we don't have the admin claim, we might need to refresh the page
        if (!hasAdminClaim && currentUser.email?.toLowerCase().endsWith('@sakany.com')) {
          console.log("User has @sakany.com email but no admin claim. This might require a page refresh.");
        }
        
        // Step 1: Delete user's data from Firestore FIRST
        // Begin batch write for Firestore operations
        console.log(`Admin deleting user ${userId} - Step 1: Deleting Firestore data`);
        const batch = writeBatch(db);

        // Delete user's properties
        const propertiesQuery = query(collection(db, "properties"), where("userId", "==", userId));
        const propertiesSnapshot = await getDocs(propertiesQuery);
        
        console.log(`Found ${propertiesSnapshot.docs.length} properties to delete for user ${userId}`);
        propertiesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Delete user document
        batch.delete(userRef);

        // Commit the batch
        await batch.commit();
        console.log(`Successfully deleted Firestore data for user ${userId}`);
        
        // Step 2: Call the dedicated admin API endpoint to delete the user from Firebase Authentication
        console.log(`Admin deleting user ${userId} - Step 2: Calling admin API to delete auth account`);
        
        // Get the admin user's email (with null check)
        if (!auth.currentUser) {
          throw new Error("Admin user not logged in");
        }
        const email = auth.currentUser.email || '';
        
        // Make absolutely sure we're using an admin account with @sakany.com email
        // This is a safeguard against authorization issues
        if (!email.toLowerCase().endsWith('@sakany.com')) {
          throw new Error("Only accounts with @sakany.com emails can perform admin operations");
        }
        
        const authDeleteResponse = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Admin-Email': email, // Add admin email as an extra verification header
          }
        });
        
        // Check response from server
        if (!authDeleteResponse.ok) {
          console.error(`Server responded with status ${authDeleteResponse.status}`);
          const errorData = await authDeleteResponse.json().catch(() => ({ message: "Unknown error" }));
          console.error("Failed to delete user from Firebase Authentication:", errorData);
          throw new Error(`Failed to delete user from Firebase Authentication: ${errorData.message || authDeleteResponse.statusText}`);
        }
        
        console.log(`Successfully deleted user ${userId} from Firebase Authentication`);
        
        // Update the local state after successful deletion
        setUsers(users.filter(user => user.uid !== userId));

        toast({
          title: "Success",
          description: "User and all associated data have been deleted successfully",
        });
      } catch (error: any) {
        console.error("Error deleting user:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("Error in delete user process:", error);
      let errorMessage = error.message || "Failed to delete user";

      if (error.code === "permission-denied") {
        errorMessage = "You don't have permission to delete users. Please verify your admin privileges.";
      } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("Not authorized")) {
        errorMessage = "You don't have the required admin permissions to delete users.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setSelectedUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Function to refresh admin token
  const handleRefreshAdminToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast({
          title: "Error",
          description: "You must be logged in to refresh your token",
          variant: "destructive",
        });
        return;
      }
      
      // Force token refresh
      await currentUser.getIdToken(true);
      
      // Get the refreshed token details
      const idTokenResult = await currentUser.getIdTokenResult();
      const hasAdminClaim = idTokenResult.claims.admin === true;
      
      console.log("Token refreshed, admin status:", {
        uid: currentUser.uid,
        email: currentUser.email,
        hasAdminClaim,
        customClaims: idTokenResult.claims
      });
      
      toast({
        title: "Token Refreshed",
        description: hasAdminClaim 
          ? "Your admin privileges are now active" 
          : "Your token was refreshed, but no admin claim was found",
      });
      
      // Force reload the page to update all UI components
      window.location.reload();
    } catch (error: any) {
      console.error("Error refreshing token:", error);
      toast({
        title: "Token Refresh Failed",
        description: error.message || "Failed to refresh your authentication token",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate("/admin/approve-properties")}>
          Property Approval
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/reports")}>
          Manage Reports
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/settings")}>
          System Settings
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/check-admin-status")}>
          Check Admin Status
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleRefreshAdminToken}
          className="ml-auto"
        >
          Refresh Admin Privileges
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>Can List Properties</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.displayName?.split('|')[0]}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.displayName?.includes('admin')
                    ? "Administrator"
                    : user.isLandlord
                      ? "Landlord"
                      : "Regular User"}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.canListProperties}
                    onCheckedChange={() => togglePropertyListing(user.uid, user.canListProperties)}
                  />
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isDeleting && selectedUserId === user.uid}>
                        {isDeleting && selectedUserId === user.uid ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete User"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this user? This action cannot be undone.
                          This will permanently delete their account and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.uid)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting && selectedUserId === user.uid}
                        >
                          {isDeleting && selectedUserId === user.uid ? "Deleting..." : "Delete Account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}