/**
 * Update Sakany Emails to Admin
 * 
 * This script grants admin privileges to all users with @sakany.com email addresses
 * Run this script with node:
 *   node update-sakany-emails-to-admin.js
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

// Function to update all users with @sakany.com emails
async function updateSakanyEmailsToAdmin() {
  try {
    console.log('Scanning for @sakany.com users to grant admin privileges...');
    
    // Get a batch of users (Firebase has a limit, we'll use 1000 at a time)
    const listUsersResult = await admin.auth().listUsers(1000);
    let adminCount = 0;
    
    // Process each user
    for (const userRecord of listUsersResult.users) {
      if (userRecord.email && userRecord.email.toLowerCase().endsWith('@sakany.com')) {
        console.log(`Found @sakany.com user: ${userRecord.email} (${userRecord.uid})`);
        
        // Check if they already have admin claim
        const hasAdminClaim = userRecord.customClaims && userRecord.customClaims.admin === true;
        
        if (hasAdminClaim) {
          console.log(`User ${userRecord.email} already has admin privileges`);
        } else {
          // Grant admin privileges
          await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
          console.log(`→ Granted admin privileges to ${userRecord.email}`);
          adminCount++;
        }
      }
    }
    
    if (adminCount > 0) {
      console.log(`\nSuccessfully granted admin privileges to ${adminCount} @sakany.com users`);
    } else {
      console.log('\nNo new @sakany.com users found that needed admin privileges');
    }
    
    return adminCount;
  } catch (error) {
    console.error('Error updating @sakany.com users:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const count = await updateSakanyEmailsToAdmin();
    console.log('\nOperation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script
main();