// Re-export Firebase services from lib/firebase.ts to prevent duplicate initialization
// This file exists only for backward compatibility with existing imports
import { app, auth, db, storage, initRecaptchaVerifier } from "./lib/firebase";

// Re-export all Firebase services
export { app, auth, db, storage, initRecaptchaVerifier };

// Update your Firebase security rules to allow property creation, messaging, and image uploads
// You can add this function to initialize an update to security rules in development if needed
export async function updateSecurityRules() {
  try {
    // This would typically call a Cloud Function to update security rules
    // For now, we'll make a direct call to our server
    const response = await fetch('/api/security-rules/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'update_rules'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update Firebase security rules');
    }

    const result = await response.json();
    console.log("Security rules update result:", result);
    return result;
  } catch (error) {
    console.error("Error updating Firebase security rules:", error);
    throw error;
  }
}

// Client-side reminder of current security rules
export function getSecurityRulesReminder() {
  return `
// Firestore Rules for Sakany Real Estate Application - TESTING RULES

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // IMPORTANT: These rules grant full access to any authenticated user.
    // This is intended for development purposes only.
    // For production, use more restrictive rules.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
  `;
}