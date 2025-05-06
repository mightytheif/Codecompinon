/**
 * Create Admin User in Firebase
 * 
 * This script creates a new user in Firebase Authentication and gives them admin privileges.
 * Run this script with node:
 *   node create-admin-user.js <email> <password> <displayName>
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

// Function to create a new admin user
async function createAdminUser(email, password, displayName) {
  try {
    console.log(`Creating new admin user with email: ${email}`);
    
    // First check if user already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      console.log(`User ${email} already exists with UID: ${existingUser.uid}`);
      console.log('Setting admin privileges for existing user...');
      await admin.auth().setCustomUserClaims(existingUser.uid, { admin: true });
      
      // Update display name if provided
      if (displayName) {
        await admin.auth().updateUser(existingUser.uid, {
          displayName: displayName
        });
      }
      
      console.log(`Admin privileges granted to existing user ${existingUser.uid}`);
      return existingUser.uid;
    } catch (existingUserError) {
      // User doesn't exist, create a new one
      if (existingUserError.code === 'auth/user-not-found') {
        // Create the new user
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: displayName || `Admin (${email})`,
          emailVerified: true
        });
        
        console.log(`Created new user with UID: ${userRecord.uid}`);
        
        // Set admin custom claim
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`Admin privileges granted to new user ${userRecord.uid}`);
        
        return userRecord.uid;
      } else {
        throw existingUserError;
      }
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Main execution
async function main() {
  // Get command line arguments
  const email = process.argv[2];
  const password = process.argv[3];
  const displayName = process.argv[4];
  
  if (!email || !password) {
    console.error('Please provide email and password');
    console.error('Usage: node create-admin-user.js <email> <password> [displayName]');
    process.exit(1);
  }
  
  try {
    const uid = await createAdminUser(email, password, displayName);
    console.log('\nAdmin user setup complete!');
    console.log('------------------------------');
    console.log(`Email: ${email}`);
    console.log(`UID: ${uid}`);
    console.log(`Display Name: ${displayName || `Admin (${email})`}`);
    console.log('Admin Privileges: YES');
    console.log('\nYou can now use this account to administer the application.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script
main();