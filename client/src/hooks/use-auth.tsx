import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  type User as FirebaseUser,
  sendEmailVerification,
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  getDoc
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, isLandlord: boolean, isAdmin?: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: { displayName?: string; email?: string; password?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAdmin: boolean;
  loginAsAdmin: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Always force a token refresh to get latest custom claims
          // This is crucial for admin status to be reflected immediately
          await user.getIdToken(true);
          
          // Get the ID token result which includes custom claims
          const idTokenResult = await user.getIdTokenResult();
          
          // Check for admin status in three ways (custom claim is primary)
          const hasAdminClaim = idTokenResult.claims.admin === true;
          const hasAdminEmail = user.email?.toLowerCase().endsWith('@sakany.com') || false;
          const hasAdminDisplayName = user.displayName?.split('|').includes('admin') || false;
          
          console.log("Admin status check:", {
            uid: user.uid,
            email: user.email,
            hasAdminClaim,
            hasAdminEmail,
            hasAdminDisplayName,
            customClaims: idTokenResult.claims
          });
          
          // Any of these conditions means the user is an admin
          setIsAdmin(hasAdminClaim || hasAdminEmail || hasAdminDisplayName);
        } catch (error) {
          console.error("Error checking admin status:", error);
          // Fallback to basic checks if token refresh fails
          setIsAdmin(
            user.email?.toLowerCase().endsWith('@sakany.com') ||
            user.displayName?.split('|').includes('admin')
          );
        }
      } else {
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sendVerificationEmail = async () => {
    if (!user) return;

    try {
      await sendEmailVerification(user);

      // Store the last verification attempt time in localStorage
      localStorage.setItem('lastEmailVerificationAttempt', Date.now().toString());

      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account",
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      let errorMessage = "Failed to send verification email";

      if (error.code === 'auth/too-many-requests') {
        // Check when the last attempt was made
        const lastAttempt = localStorage.getItem('lastEmailVerificationAttempt');
        if (lastAttempt) {
          const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
          const minutesLeft = Math.ceil((60 * 1000 - timeSinceLastAttempt) / (60 * 1000));

          if (minutesLeft > 0) {
            errorMessage = `Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before requesting another verification email`;
          }
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

  // Check if 2FA is required for the user
  const check2FARequirement = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      if (!userData) return { required: false };
      
      // Check if either email or SMS 2FA is enabled
      const email2FAEnabled = userData.twoFactorEnabled || false;
      const sms2FAEnabled = userData.phoneAuth2FA || false;
      
      return {
        required: email2FAEnabled || sms2FAEnabled,
        methods: {
          email: email2FAEnabled,
          sms: sms2FAEnabled,
          phoneNumber: userData.phoneNumber || null
        }
      };
    } catch (error) {
      console.error("Error checking 2FA requirement:", error);
      return { required: false };
    }
  };

      toast({
        title: "Welcome back!",
        description: "Successfully logged in",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, isLandlord: boolean, isAdmin: boolean = false) => {
    try {
      // Check if trying to register as admin with valid email
      if (isAdmin && !email.toLowerCase().endsWith('@sakany.com')) {
        throw new Error("Admin accounts must use a @sakany.com email address");
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Set display name with proper roles
      const displayNameParts = [name];
      displayNameParts.push(isLandlord ? 'landlord' : 'user');
      if (isAdmin || email.toLowerCase().endsWith('@sakany.com')) {
        displayNameParts.push('admin');
      }

      await updateProfile(user, {
        displayName: displayNameParts.join('|')
      });

      // Create user document in Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: email,
        displayName: displayNameParts.join('|'),
        isLandlord: isLandlord,
        canListProperties: isLandlord,
        createdAt: new Date().toISOString()
      });

      // Send verification email
      await sendEmailVerification(user);

      toast({
        title: "Welcome to SAKANY!",
        description: "Please check your email to verify your account",
      });

      // If it's an admin account, log in as admin
      if (isAdmin || email.toLowerCase().endsWith('@sakany.com')) {
        await loginAsAdmin(email, password);
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "Come back soon!",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password",
      });
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserProfile = async (data: { displayName?: string; email?: string; password?: string }) => {
    if (!auth.currentUser) {
      throw new Error("No user is currently logged in");
    }

    try {
      const updates: Promise<void>[] = [];

      if (data.displayName) {
        // Preserve the user type (landlord/user) and admin status when updating the display name
        const currentDisplayName = auth.currentUser.displayName || "";
        const parts = currentDisplayName.split("|");
        const userType = parts[1] || "user";
        const isAdmin = parts.includes("admin");
        updates.push(updateProfile(auth.currentUser, {
          displayName: `${data.displayName}|${userType}${isAdmin ? '|admin' : ''}`
        }));
      }

      if (data.email) {
        updates.push(updateEmail(auth.currentUser, data.email));
      }

      if (data.password) {
        updates.push(updatePassword(auth.currentUser, data.password));
      }

      await Promise.all(updates);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) {
      throw new Error("No user is currently logged in");
    }

    try {
      // Step 1: Get the current user's ID and token for authentication
      const userId = auth.currentUser.uid;
      const token = await auth.currentUser.getIdToken();
      
      // Step 2: Delete user's Firestore data
      const userRef = doc(db, "users", userId);
      
      console.log(`Deleting Firestore data for user ${userId}`);
      
      // Delete user's properties first
      const batch = writeBatch(db);
      const propertiesQuery = query(collection(db, "properties"), where("userId", "==", userId));
      const propertiesSnapshot = await getDocs(propertiesQuery);
      
      console.log(`Found ${propertiesSnapshot.docs.length} properties to delete`);
      propertiesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete user document
      batch.delete(userRef);
      
      // Commit the batch to delete user data
      await batch.commit();
      console.log(`Successfully deleted Firestore data for user ${userId}`);
      
      // Step 3: Call the dedicated self-deletion API endpoint
      console.log("Calling self-deletion API endpoint");
      const authDeleteResponse = await fetch(`/api/users/self`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!authDeleteResponse.ok) {
        const errorData = await authDeleteResponse.json().catch(() => ({ message: "Unknown error" }));
        console.error("Self-deletion API failed:", errorData);
        
        // If server-side deletion fails, try client-side deletion as fallback
        console.log("Attempting client-side account deletion as fallback");
        try {
          await deleteUser(auth.currentUser);
          console.log("Client-side account deletion successful");
        } catch (clientDeleteError) {
          console.error("Failed to delete user with client SDK:", clientDeleteError);
          throw new Error("Failed to delete user account: " + (errorData.message || "Unknown error"));
        }
      } else {
        console.log("Self-deletion API successful");
      }
      
      // Step 4: Sign out the user (even if deletion failed, to prevent access to a potentially broken account)
      console.log("Signing out user after account deletion");
      await signOut(auth);
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
      throw error;
    }
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      if (!email.toLowerCase().endsWith('@sakany.com')) {
        throw new Error("This email is not authorized as admin");
      }
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome Admin!",
        description: "Successfully logged in as administrator",
      });
    } catch (error: any) {
      toast({
        title: "Admin Login Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        resetPassword,
        updateUserProfile,
        deleteAccount,
        isAdmin,
        loginAsAdmin,
        sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}