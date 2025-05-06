
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Helper function to get the appropriate storage path
export function getUserUploadPath(fileName: string) {
  // Using a simplified path structure that matches our new security rules
  // This avoids complex nesting that could cause permission issues
  return `images/${fileName}`;
}

/**
 * Uploads a file to Firebase Storage with fallback to server upload
 * @param file File to upload
 * @param folder Firebase storage folder (optional)
 * @returns Promise with the download URL
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    // First attempt: Firebase Storage upload
    console.log("Starting upload to Firebase storage...");
    
    const storage = getStorage();
    const timestamp = Date.now();
    // Use the simplified path format with our relaxed security rules
    const storageRef = ref(storage, `images/${timestamp}-${file.name}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Optional: track progress
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          console.log("Firebase upload error:", error);
          // If Firebase upload fails, try server upload as fallback
          console.log("Attempting fallback upload to server...");
          serverUpload(file)
            .then(resolve)
            .catch(reject);
        },
        async () => {
          // Firebase upload successful, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.log("Failed to initialize upload:", error);
    // Try server upload as fallback for any initialization errors
    return serverUpload(file);
  }
}

/**
 * Fallback method to upload files directly to the server
 * @param file File to upload
 * @returns Promise with the URL path
 */
async function serverUpload(file: File): Promise<string> {
  console.log("Starting file upload, file size:", file.size, "bytes");
  
  const formData = new FormData();
  formData.append("file", file);
  
  console.log("Sending file to server...");
  
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  
  console.log("Server response:", response.status, await response.text());
  
  if (!response.ok) {
    throw new Error(`Server upload failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Upload successful, URL:", data.url);
  
  return data.url;
}
