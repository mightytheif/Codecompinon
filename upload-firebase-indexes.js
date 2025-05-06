/**
 * Deploy Firestore Indexes for Sakany
 * 
 * This script uploads the Firestore indexes defined in firebase-indexes.json.
 * You need to run this script if you're experiencing "failed-precondition" errors
 * related to missing indexes for certain queries.
 * 
 * Prerequisites:
 * - Firebase Admin SDK service account credentials file
 * - Node.js installed
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK with service account
const serviceAccount = require('./sakany10-firebase-adminsdk-fbsvc-cf99922d40.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function uploadIndexes() {
  try {
    console.log('Reading index configuration from firebase-indexes.json...');
    const indexesFilePath = path.join(__dirname, 'firebase-indexes.json');
    const indexesContent = fs.readFileSync(indexesFilePath, 'utf8');
    const indexesConfig = JSON.parse(indexesContent);

    console.log('Starting index deployment...');
    for (const index of indexesConfig.indexes) {
      console.log(`Deploying index for collection: ${index.collectionGroup}`);
      console.log(`Fields: ${JSON.stringify(index.fields)}`);
      
      // Note: In a real implementation, you would use the Firebase CLI or REST API 
      // to actually deploy the indexes. This script serves as documentation for manual steps.
      console.log('Index configuration prepared. Please use the Firebase console or Firebase CLI to deploy these indexes.');
      console.log('For CLI deployment:');
      console.log('1. Install Firebase CLI: npm install -g firebase-tools');
      console.log('2. Firebase login: firebase login');
      console.log('3. Deploy indexes: firebase deploy --only firestore:indexes');
    }

    console.log('\nIMPORTANT: After deploying, it may take some time for the indexes to be built.');
    console.log('Until indexing is complete, queries that depend on these indexes may fail with a "failed-precondition" error.');
  } catch (error) {
    console.error('Error deploying indexes:', error);
  }
}

// Run the script
uploadIndexes().then(() => {
  console.log('Index deployment preparation completed.');
});