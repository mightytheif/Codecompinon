import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { uploadToObjectStorage } from "@/lib/object-storage";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

// Update image upload path to include user ID for Firebase storage security rules
export const getStoragePath = (filename: string) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid || 'anonymous';
  return `user_uploads/${userId}/${filename}`;
};

export function ImageUpload({
  onUpload,
  disabled = false,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const storage = getStorage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    uploadImage(file);
  };

  const uploadImage = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Check if Firebase storage is initialized
    if (!storage) {
      console.error("Firebase storage is not initialized");
      toast({
        title: "Upload failed",
        description: "Firebase storage is not properly initialized",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    // Get current user's ID for the upload path
    try {
      console.log("Starting upload to Firebase storage...");

      // First check if user is authenticated
      const auth = getAuth();
      if (!auth.currentUser) {
        console.log("User not authenticated, using server fallback...");
        tryServerUpload(file);
        return;
      }

      console.log("User authenticated:", auth.currentUser.uid);
      
      // Create a simpler path - less chance of permission issues with new security rules
      const path = `images/${fileName}`;
      console.log("Upload path:", path);
      
      // Check Firebase Storage initialized correctly
      try {
        console.log("Firebase app config:", JSON.stringify({
          storageBucket: storage?.app?.options?.storageBucket || 'Not available'
        }));
      } catch (e) {
        console.log("Error retrieving Firebase config:", e);
      }
      
      const storageRef = ref(storage, path);
      console.log("Storage reference created successfully");
      
      // Set a flag to track if Firebase upload fails
      console.log("Creating upload task for file:", file.name, "size:", file.size, "type:", file.type);
      
      // Check if the file object is valid
      if (!file || !file.size) {
        console.error("Invalid file object:", file);
        tryServerUpload(file);
        return;
      }
      
      // Try to create the upload task
      let uploadTask;
      try {
        uploadTask = uploadBytesResumable(storageRef, file);
        console.log("Upload task created successfully");
      } catch (err) {
        console.error("Failed to create upload task:", err);
        tryServerUpload(file);
        return;
      }
      
      // Set a timeout to fallback to server upload if Firebase is taking too long
      const uploadTimeout = setTimeout(() => {
        console.log("Firebase upload taking too long, falling back to server upload");
        tryServerUpload(file);
      }, 20000); // 20 seconds timeout

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
          setUploadProgress(progress);
        },
        (error) => {
          // Clear the timeout as we've gotten a response (albeit an error)
          clearTimeout(uploadTimeout);
          console.error("Firebase upload error:", error.code, error.message);
          
          // Provide more specific error messages based on error code
          let errorDetails = "Unknown error";
          switch(error.code) {
            case 'storage/unauthorized':
              errorDetails = "User doesn't have permission to access the object";
              break;
            case 'storage/canceled':
              errorDetails = "User canceled the upload";
              break;
            case 'storage/unknown':
              errorDetails = "Unknown error occurred, inspect error.serverResponse";
              break;
            case 'storage/quota-exceeded':
              errorDetails = "Quota exceeded for Firebase Storage";
              break;
            case 'storage/unauthenticated':
              errorDetails = "User is unauthenticated, please authenticate and try again";
              break;
            case 'storage/invalid-checksum':
              errorDetails = "File on the client does not match the checksum of the file received by the server";
              break;
            case 'storage/retry-limit-exceeded':
              errorDetails = "The maximum time limit on an operation (upload, download, delete, etc.) has been exceeded";
              break;
          }
          
          console.error("Firebase upload error details:", errorDetails);
          console.error("Full error:", JSON.stringify(error));
          
          // Try fallback to server upload
          tryServerUpload(file);
        },
        () => {
          // Clear the timeout as upload completed successfully
          clearTimeout(uploadTimeout);
          console.log("Upload complete, getting download URL...");
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("Download URL:", downloadURL);
            onUpload(downloadURL);
            setIsUploading(false);
            toast({
              title: "Upload successful",
              description: "Image has been uploaded successfully",
            });
          }).catch((error) => {
            console.error("Error getting download URL:", error);
            tryServerUpload(file);
          });
        }
      );
    } catch (err) {
      console.error("Failed to initialize upload:", err);
      tryServerUpload(file);
    }
  };
  
  // Helper function to try server upload as fallback
  const tryServerUpload = async (file: File) => {
    try {
      console.log("Attempting fallback upload to server...");
      setUploadProgress(10); // Reset progress for new upload
      const downloadURL = await uploadToObjectStorage(file);
      console.log("Server upload successful:", downloadURL);
      onUpload(downloadURL);
      setIsUploading(false);
      toast({
        title: "Upload successful",
        description: "Image was uploaded using the backup method",
      });
    } catch (serverError) {
      console.error("Server upload error:", serverError);
      toast({
        title: "Upload failed",
        description: "Failed to upload image through both methods",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 h-full ${className}`}>
      <input
        type="file"
        accept="image/*"
        id="image-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <div className="text-sm font-medium">Uploading...</div>
            <div className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</div>
          </div>
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center cursor-pointer gap-2"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <div className="text-sm font-medium">Click to upload</div>
            <div className="text-xs text-muted-foreground">
              JPG, PNG, GIF (max 5MB)
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            className="mt-2"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            Select Image
          </Button>
        </label>
      )}
    </div>
  );
}