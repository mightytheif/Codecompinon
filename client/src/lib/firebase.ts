import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
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

// Initialize Firebase
console.log('Initializing Firebase app...');
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
console.log('Initializing Firebase auth...');
export const auth = getAuth(app);

// Initialize Firestore with settings to avoid failed-precondition errors
console.log('Initializing Firebase firestore...');
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Initialize Firebase Storage
console.log('Initializing Firebase storage...');
export const storage = getStorage(app);

// Export RecaptchaVerifier for phone authentication
export const initRecaptchaVerifier = (containerId: string) => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => {
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });
};

export default { app, auth, db, storage };