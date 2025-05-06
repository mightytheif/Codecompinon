
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as fs from 'fs';
import * as path from 'path';

// Load service account from JSON file for better security
let serviceAccount;
try {
  // Try loading from file
  const serviceAccountPath = path.join(process.cwd(), 'sakany10-firebase-adminsdk-fbsvc-cf99922d40.json');
  console.log(`Loading Firebase Admin SDK credentials from: ${serviceAccountPath}`);
  
  if (fs.existsSync(serviceAccountPath)) {
    const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(rawData);
    console.log("Firebase Admin SDK credentials loaded successfully from file");
  } else {
    console.error(`Service account file not found at: ${serviceAccountPath}`);
    // Fallback to hardcoded credentials as a last resort
    serviceAccount = {
      type: "service_account",
      project_id: "sakany10",
      private_key_id: "cf99922d404debbae3117486edc135025e1188ac",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfi6yWIGJfkrck\nTE/9AvePscLphbdImBwjxjgpcOoTKq4woduJyjn8wHQyjrO4NVBeJS74q12/4lHs\nPEzFtof/yyZAntf+X40T1cfZp7IgHyvy0hkfrWgrnUlzAYLoMlGKnXbqBKyTUw9x\nERRxbBVSVGije2iU5JqzPMD4qLyawVb/8Qu+Y7WThZXru5zGgj7JA+lcE57bwqQ5\njAHjrHBnatDf1M785m1ckJeHP9Bt89FyoHdGgnKl8AyiZ+iNq6lSNQLLiy87A9l4\nPm4ffDL64TsPlOersQvg2Ui5AtIDKmafBdFRpPQHwgnW+fmTAaMUTt8gdrXv8Ono\nSdDomORbAgMBAAECggEANaSNs7BRwxaeUysBXe1odTzsbv3RgSv7kh+sdGqNmUIp\nbRqOqQaAdrXym6kVTiNG0VCpOVzM2Z5rswUXPwa/NUcFpoaB0vongfrIBit3HYu9\niBgR8G+qbbeloXBppk580iFdgRNvPt2XfImkmPohNRxCTm1I3X77cLZFn5WETHea\niU4UesRtJoFkY0Hx403kHFi8H7sHdU24nZh19F7/qAJAXlyZv4IuPiys1JjfPetQ\n670bMCDQj/VUf1H+9P0NKl+oltKTlHihnFA2FPWASSom2rScbraVHxDJ11wicY3a\n64h7wOO11p9mC5muJAfOTFQ1nTqGlezx5ofGa8IbIQKBgQDfMfDlmXBINO+/LpQV\nJud6H0JmL7SSCtd7cszzrzX4cCc/bts4DjrEWIa13oOVpNf3Iw954PWCGsBtund7\nxHrdFFydp7XGFEf2YqgwmpCfqsHVg56XFuCCu/iKlTzUHAJWdJp+hr2mz0RvHsoW\nnyDrrcFoVPEou88QTe5Yng/fiwKBgQC2/tLIn0bSQouI9hQCkpVfaRezMjyN6/aC\nybsxJFCARcdVcH+9bsUnGbrqKQX7V78k2bnT2THk1ePm1hyR1eOMekuQRYYIX7Gm\nlzWq+x0fc6UhPzKKTomxGh7sNuuCGz9i51sr1WChXXe00yq+KYSnCoKFSf4H+eWx\n1FWUhyyocQKBgCd6Zem2oi2jb2SZkIfNQdRQAyaf+Yh7cnHbdHUF4L342HhX216m\n5a4lGm7A1PV7GtgT04DzUXmZ0b+W49t4fWLtXxRjvbsziycBfE5ciIg1Y+OoTDzd\nRwjYxrV8gC3kZmV0an9GxfTjZG9jOsuVifUl3rfdjmpuDcoMfsQd8SDRAoGBAK/W\nwLhixGy54NakjqnCLKJXm5xnQ2SkPmWCbstTt77qThY9WaGvVOazhLYI4WSY9mT0\niemVJKpdFPb0+tLvkg2kXgOtqpNVUKFhXwKC9YMJXr1JusjHmuuAzAHy6+5DPG9P\nHH5MNOQZqjMpTkMYJg1UvgJSDTWg3SQ5glqMYU8hAoGACu+xjGVGYu6BoGMpYBBC\ns/iD6og4BZXWieDvjmAFOyc8/7TQ0jgtoev4VTjqg3v2awIo6g3x2UhpEYs727bK\nZZJ1xZ53M1HDnYZ9ce3utK8x3G500eA9AoQRO83sOc4aCxt/rzsS9Fq7tq9Xyt6s\nOeCJdsa+R3+0QfOSBxd3iAg=\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@sakany10.iam.gserviceaccount.com",
      client_id: "115982023406421571796",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sakany10.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    };
    console.log("Using hardcoded Firebase Admin SDK credentials");
  }
} catch (error) {
  console.error("Error loading Firebase Admin SDK credentials:", error);
  throw new Error("Failed to initialize Firebase Admin SDK");
}

// Initialize the app with admin credentials
let app;
let auth;
let db;
let firebaseStorage;

try {
  console.log("Initializing Firebase Admin SDK with service account...");
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: "sakany10.firebasestorage.app",
    databaseURL: "https://sakany10-default-rtdb.firebaseio.com"
  });

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseStorage = getStorage(app); // Renamed from 'storage' to avoid duplicate declarations

  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

// Export Firebase services
export { auth, db, firebaseStorage };
