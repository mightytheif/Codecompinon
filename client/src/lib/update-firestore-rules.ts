import { app } from './firebase';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

/**
 * Updates Firestore security rules from a provided string
 * This is typically used in development to make updating rules easier
 * In production, rules should be deployed through Firebase CLI
 */
export async function updateFirestoreRules(rulesString: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the current user
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      return { 
        success: false, 
        message: 'You must be logged in to update security rules' 
      };
    }
    
    // Check if the user is an admin (has @sakany.com email)
    const isAdmin = user.email?.toLowerCase().endsWith('@sakany.com');
    
    if (!isAdmin) {
      return { 
        success: false, 
        message: 'Only administrators can update security rules' 
      };
    }
    
    // In a real production environment, we would call a Cloud Function to update rules
    try {
      // Demo mode - we'll just pretend this worked since we don't have a real Firebase project
      console.log('DEMO MODE: Would update Firebase rules with:', rulesString);
      
      // In a real app with Firebase Functions:
      /*
      const functions = getFunctions(app);
      const updateRules = httpsCallable(functions, 'updateFirestoreRules');
      const result = await updateRules({ rules: rulesString });
      */
      
      // Save the rules to local storage so they persist in the demo
      localStorage.setItem('firebase-security-rules', rulesString);
      
      return { 
        success: true, 
        message: 'Firestore security rules updated successfully (DEMO MODE)' 
      };
    } catch (functionError: any) {
      console.error('Error calling Firebase function:', functionError);
      return {
        success: false,
        message: functionError.message || 'Error updating security rules via Firebase function'
      };
    }
  } catch (error: any) {
    console.error('Error updating Firestore rules:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to update security rules' 
    };
  }
}

/**
 * Reads the contents of firebase-rules.txt and updates Firestore security rules
 */
export async function updateRulesFromFile(): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch the rules file
    const response = await fetch('/firebase-rules.txt');
    
    if (!response.ok) {
      throw new Error('Could not fetch rules file');
    }
    
    const rulesString = await response.text();
    return updateFirestoreRules(rulesString);
  } catch (error: any) {
    console.error('Error reading rules file:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to read rules file' 
    };
  }
}

/**
 * Gets the currently applied Firestore security rules
 */
export function getCurrentRules(): string {
  // In a real application, this would query the Firebase Rules API
  // For our demo, we'll use local storage or return the default rules
  const savedRules = localStorage.getItem('firebase-security-rules');
  
  if (savedRules) {
    return savedRules;
  }
  
  // Default rules if none are saved
  return `// Firestore Rules for Sakany Real Estate Application

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default rules
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;
}