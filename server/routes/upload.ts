import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created upload directory:', uploadDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get user ID from request headers or default to 'anonymous'
    const userId = (req.headers['x-user-id'] || 'anonymous') as string;
    const userDir = path.join(uploadDir, userId);
    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Handle image uploads
router.post('/upload', (req, res) => {
  console.log('Upload request received');
  console.log('Headers:', req.headers);
  
  // Get user ID from the request, defaulting to anonymous
  const userId = (req.headers['x-user-id'] || 'anonymous') as string;
  console.log('User ID for upload:', userId);
  
  // Create temporary upload middleware for this specific request
  const userUpload = multer({ 
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  }).single('file');
  
  userUpload(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('File uploaded successfully:', req.file.filename);
      
      // Construct the file path relative to the public directory
      const filePath = `/uploads/${userId}/${req.file.filename}`;
      console.log('Public file path:', filePath);

      // Return the URL and filename in the response
      return res.status(200).json({
        url: filePath,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Upload processing error:', error);
      return res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  });
});

export default router;