/**
 * Check Admin Status for Firebase Users
 * 
 * This script checks if a user has admin privileges (custom claims) in Firebase Authentication.
 * Run this script with node:
 *   node check-admin-status.js <user-email>
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

// Function to check admin claim for a user by email
async function checkAdminStatusByEmail(email) {
  try {
    // Get the user by email
    const user = await admin.auth().getUserByEmail(email);
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(`User details for ${email}:`);
    console.log(`- UID: ${user.uid}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Email verified: ${user.emailVerified}`);
    console.log(`- Display name: ${user.displayName || '(not set)'}`);
    console.log(`- Custom claims:`, user.customClaims || '(none)');
    
    // Check if user has admin claim
    const isAdmin = user.customClaims && user.customClaims.admin === true;
    console.log(`\nAdmin status: ${isAdmin ? 'YES ✓' : 'NO ✗'}`);
    
    if (!isAdmin) {
      console.log(`\nTo grant admin privileges, run:`);
      console.log(`node set-admin-claims.js ${email}`);
    }
    
    return { user, isAdmin };
  } catch (error) {
    console.error('Error checking admin status:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  // Get the email from command line arguments
  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address');
    console.error('Usage: node check-admin-status.js <user-email>');
    process.exit(1);
  }
  
  try {
    await checkAdminStatusByEmail(email);
    process.exit(0);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script
main();