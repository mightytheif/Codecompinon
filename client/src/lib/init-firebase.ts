import { app, db, auth, storage } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Initializes Firebase and ensures proper database access
 */
export async function initializeFirebase() {
  console.log("Initializing Firebase security...");
  
  // Check if user is logged in
  const user = auth.currentUser;
  
  if (!user) {
    console.log("No user logged in, using default permissions");
    return;
  }
  
  try {
    // Check if the user document exists
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // Create a basic user document for Firebase security rules to work properly
      const isAdmin = user.email?.toLowerCase().endsWith('@sakany.com') || false;
      
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        isAdmin: isAdmin,
        createdAt: new Date(),
      });
      
      console.log("Created user document for Firebase security");
    }
    
    console.log("Firebase initialization successful");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

/**
 * Sets up a listener to initialize Firebase when auth state changes
 */
export function setupFirebaseInitialization() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await initializeFirebase();
    }
  });
  
  // Also run once at startup
  initializeFirebase();
}