// Script to check current Firestore security rules and test permissions
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyAPjLVvkjb1fDk75GyGScb6C-csclM5xbQ",
  authDomain: "sakany10.firebaseapp.com",
  databaseURL: "https://sakany10-default-rtdb.firebaseio.com",
  projectId: "sakany10",
  storageBucket: "sakany10.firebasestorage.app",
  messagingSenderId: "894759727168",
  appId: "1:894759727168:web:28add29944f36f4f6d6fa5",
  measurementId: "G-0DL7TMSE7P"
};

// Print the recommended rules
const recommendedRules = fs.readFileSync(path.join(__dirname, 'firebase-rules.txt'), 'utf8');
console.log('========== RECOMMENDED SECURITY RULES ==========');
console.log(recommendedRules);
console.log('===============================================');
console.log('\n');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testFirebasePermissions() {
  try {
    // First try to check access without authentication
    console.log('Testing unauthenticated access...');
    try {
      const propertiesRef = collection(db, 'properties');
      await getDocs(propertiesRef);
      console.log('✅ Successfully read properties without authentication (expected behavior)');
    } catch (error) {
      console.log(`❌ Error reading properties without authentication: ${error.message}`);
    }

    // Test creation of a conversation (should fail without auth)
    try {
      const conversationsRef = collection(db, 'conversations');
      await addDoc(conversationsRef, {
        participants: ['test1', 'test2'],
        lastMessage: 'Test message',
        createdAt: new Date()
      });
      console.log('❌ Should not be able to create conversations without authentication');
    } catch (error) {
      console.log('✅ Properly denied creating conversations without authentication (expected behavior)');
    }

    console.log('\nTo test authenticated operations:');
    console.log('1. Log in to the Firebase console: https://console.firebase.google.com/project/sakany10/firestore/rules');
    console.log('2. Replace the current rules with the rules shown above from firebase-rules.txt');
    console.log('3. Click "Publish" to make the rules active');
    console.log('\nAfter updating the rules, try using the app again to create conversations and send messages.');

  } catch (err) {
    console.error('Error testing permissions:', err);
  }
}

testFirebasePermissions();