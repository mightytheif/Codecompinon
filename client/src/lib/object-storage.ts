
// A utility for handling file uploads using the server as a proxy to Replit Object Storage
export async function uploadToObjectStorage(file: File): Promise<string> {
  try {
    console.log('Starting server file upload, file size:', file.size, 'bytes');
    
    // Validate file size before uploading (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds the 5MB limit');
    }
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Try to get the current user ID from Firebase Auth
    let userId = 'anonymous';
    try {
      const auth = await import('firebase/auth').then(module => module.getAuth());
      if (auth.currentUser) {
        userId = auth.currentUser.uid;
      }
    } catch (e) {
      console.log('Could not get Firebase user ID, using anonymous');
    }
    
    console.log('Sending file to server for user:', userId);
    
    // Send the file to the server
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'x-user-id': userId
      },
      body: formData,
    });
    
    let responseText;
    try {
      responseText = await response.text();
      console.log('Server response:', response.status, responseText);
    } catch (e) {
      console.error('Failed to get response text:', e);
      throw new Error('Failed to get response from server');
    }
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${responseText}`);
    }
    
    // Parse the response JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse server response:', e);
      throw new Error('Invalid response from server');
    }
    
    if (!data.url) {
      throw new Error('Invalid response: missing URL in server response');
    }
    
    console.log('Server upload successful, URL:', data.url);
    return data.url;
  } catch (error) {
    console.error('Error uploading to object storage:', error);
    throw error;
  }
}
