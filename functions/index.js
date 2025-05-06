/**
 * Cloud Functions for Firebase
 * 
 * This file contains Cloud Functions used by the Sakany real estate app
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import the auto admin claim functions
const { autoAdminClaim, grantAdminToExistingSakanyEmails } = require('./auto-admin-claim');

/**
 * Updates Firestore security rules
 * 
 * Note: This function is secured to only allow admin users to update rules
 */
exports.updateFirestoreRules = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Get user record
  const user = await admin.auth().getUser(context.auth.uid);
  
  // Check for admin claim in Firebase custom claims (primary check)
  const hasAdminClaim = user.customClaims && user.customClaims.admin === true;
  
  // Check for @sakany.com email domain (secondary check)
  const hasAdminEmail = user.email && user.email.toLowerCase().endsWith('@sakany.com');
  
  // User must have EITHER the admin custom claim OR an @sakany.com email to be an admin
  const isAdmin = hasAdminClaim || hasAdminEmail;

  if (!isAdmin) {
    console.log(`User ${user.uid} (${user.email}) attempted to update rules but lacks admin privileges`);
    console.log(`Admin claim: ${hasAdminClaim ? 'YES' : 'NO'}, Admin email: ${hasAdminEmail ? 'YES' : 'NO'}`);
    
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can update security rules.'
    );
  }

  // Check if rules are provided
  if (!data.rules || typeof data.rules !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "rules" argument containing the security rules string.'
    );
  }

  try {
    // Note: In a production environment, you'd use the Firebase Admin SDK's 
    // Security Rules API to update the rules directly.
    // For this demo, we'll just return success since we don't have access to the Firebase project settings.
    console.log('Rules would be updated with:', data.rules);

    return {
      success: true,
      message: 'Firestore security rules would be updated in a production environment'
    };
  } catch (error) {
    console.error('Error updating Firestore rules:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update Firestore security rules: ' + error.message
    );
  }
});

// Export the auto admin claim functions
exports.autoAdminClaim = autoAdminClaim;
exports.grantAdminToExistingSakanyEmails = grantAdminToExistingSakanyEmails;