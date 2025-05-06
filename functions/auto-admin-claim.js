/**
 * Auto Admin Claim for @sakany.com email addresses
 * 
 * This Cloud Function automatically grants admin privileges to users 
 * who register with an email address ending in @sakany.com
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// This function is triggered when a new user is created
exports.autoAdminClaim = functions.auth.user().onCreate(async (user) => {
  try {
    // Check if the user's email ends with @sakany.com
    if (user.email && user.email.toLowerCase().endsWith('@sakany.com')) {
      console.log(`Auto-granting admin privileges to ${user.email} (${user.uid})`);
      
      // Set the admin custom claim
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      
      console.log(`Successfully granted admin privileges to ${user.email}`);
      
      // Return success
      return { success: true, message: `Admin privileges granted to ${user.email}` };
    }
    
    // If not a sakany.com email, log and return
    console.log(`User ${user.email} not eligible for automatic admin privileges`);
    return { success: false, message: 'Not a sakany.com email address' };
  } catch (error) {
    console.error(`Error auto-granting admin privileges:`, error);
    return { success: false, error: error.message };
  }
});

// This function grants admin claim to existing users with @sakany.com emails
// Can be triggered via HTTP request (admin only)
exports.grantAdminToExistingSakanyEmails = functions.https.onCall(async (data, context) => {
  // Ensure the requester is already an admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only admins can run this function'
    );
  }
  
  try {
    console.log('Scanning for existing @sakany.com users to grant admin privileges');
    
    // Get a batch of users (Firebase has a limit, we'll get 1000 at a time)
    const listUsersResult = await admin.auth().listUsers(1000);
    let adminCount = 0;
    
    // Process each user
    for (const userRecord of listUsersResult.users) {
      if (userRecord.email && userRecord.email.toLowerCase().endsWith('@sakany.com')) {
        // Check if they already have admin claim
        const hasAdminClaim = userRecord.customClaims && userRecord.customClaims.admin === true;
        
        if (!hasAdminClaim) {
          // Grant admin privileges
          await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
          console.log(`Granted admin privileges to existing user ${userRecord.email}`);
          adminCount++;
        }
      }
    }
    
    return { 
      success: true, 
      message: `Granted admin privileges to ${adminCount} existing @sakany.com users` 
    };
  } catch (error) {
    console.error('Error granting admin to existing users:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});