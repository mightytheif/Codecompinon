
// This file helps you verify your Firebase configuration is working

console.log("Firebase configuration helper");
console.log("============================");
console.log("You need to add your Firebase Admin private key to Replit Secrets");
console.log("1. Go to the Replit Secrets tool (lock icon in the sidebar)");
console.log("2. Add a secret with key: FIREBASE_PRIVATE_KEY");
console.log("3. The value should be your Firebase Admin SDK private key");
console.log("");
console.log("Once you've added the private key, update the server/firebase.ts file");
console.log("with the correct privateKey reference: process.env.FIREBASE_PRIVATE_KEY");

// The below configuration is a reminder of what you need for the client side
const clientConfig = {
  apiKey: "AIzaSyAPjLVvkjb1fDk75GyGScb6C-csclM5xbQ",
  authDomain: "sakany10.firebaseapp.com",
  databaseURL: "https://sakany10-default-rtdb.firebaseio.com",
  projectId: "sakany10",
  storageBucket: "sakany10.firebasestorage.app",
  messagingSenderId: "894759727168",
  appId: "1:894759727168:web:28add29944f36f4f6d6fa5",
  measurementId: "G-0DL7TMSE7P"
};

console.log("\nClient configuration (already updated):");
console.log(JSON.stringify(clientConfig, null, 2));
