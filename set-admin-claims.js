/**
 * Set Admin Claims for Firebase Users
 * 
 * This script sets the 'admin' custom claim for specified users in Firebase Authentication.
 * Run this script with node:
 *   node set-admin-claims.js <user-email>
 * 
 * Prerequisites:
 * - Firebase Admin SDK service account credentials file
 * - Node.js installed
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./sakany10-firebase-adminsdk-fbsvc-cf99922d40.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Function to set admin claim for a user by email
async function setAdminClaimByEmail(email) {
  try {
    // Get the user by email
    const user = await admin.auth().getUserByEmail(email);
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    
    // Set custom claims - this is a complete override of any existing claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`Successfully set admin claim for user ${user.uid} (${email})`);
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Updated user custom claims:', updatedUser.customClaims);
    
    return user.uid;
  } catch (error) {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  // Get the email from command line arguments
  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address');
    console.error('Usage: node set-admin-claims.js <user-email>');
    process.exit(1);
  }
  
  try {
    const uid = await setAdminClaimByEmail(email);
    console.log(`Admin privileges granted to user (${uid}). You can now use this account to administer the application.`);
    process.exit(0);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script
main();