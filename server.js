import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Initialize dotenv
dotenv.config();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account from file
const serviceAccountPath = resolve(__dirname, './serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://sakany10-default-rtdb.firebaseio.com"
});

const db = getFirestore();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Properties API endpoints
app.get('/api/properties', async (req, res) => {
  try {
    // Extract filters from query parameters
    const filters = {
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      location: req.query.location || null,
      minSquareFeet: req.query.minSquareFeet ? parseInt(req.query.minSquareFeet) : null,
      maxSquareFeet: req.query.maxSquareFeet ? parseInt(req.query.maxSquareFeet) : null,
      propertyType: req.query.propertyType ? req.query.propertyType.split(',') : null,
      minBedrooms: req.query.minBedrooms ? parseInt(req.query.minBedrooms) : null,
      minBathrooms: req.query.minBathrooms ? parseFloat(req.query.minBathrooms) : null,
      amenities: req.query.amenities ? req.query.amenities.split(',') : null
    };

    // Build Firestore query
    let query = db.collection('properties');
    
    // Apply filters
    if (filters.minPrice) {
      query = query.where('price', '>=', filters.minPrice);
    }
    
    if (filters.maxPrice) {
      query = query.where('price', '<=', filters.maxPrice);
    }
    
    if (filters.minBedrooms) {
      query = query.where('bedrooms', '>=', filters.minBedrooms);
    }
    
    if (filters.minBathrooms) {
      query = query.where('bathrooms', '>=', filters.minBathrooms);
    }
    
    if (filters.minSquareFeet) {
      query = query.where('squareFeet', '>=', filters.minSquareFeet);
    }
    
    if (filters.maxSquareFeet) {
      query = query.where('squareFeet', '<=', filters.maxSquareFeet);
    }
    
    if (filters.propertyType && filters.propertyType.length === 1) {
      query = query.where('propertyType', '==', filters.propertyType[0]);
    }

    // Apply pagination
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDirection = req.query.sortDirection || 'desc';
    
    query = query.orderBy(sortBy, sortDirection).limit(pageSize);
    
    // Execute query
    const snapshot = await query.get();
    
    // Process results
    let properties = [];
    snapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Client-side filtering for multiple property types, location, and amenities
    if (filters.propertyType && filters.propertyType.length > 1) {
      properties = properties.filter(property => 
        filters.propertyType.includes(property.propertyType)
      );
    }
    
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      properties = properties.filter(property => 
        property.city?.toLowerCase().includes(locationLower) || 
        property.zipcode === filters.location
      );
    }
    
    if (filters.amenities && filters.amenities.length > 0) {
      properties = properties.filter(property => {
        const propertyAmenities = property.amenities || [];
        return filters.amenities.every(amenity => 
          propertyAmenities.includes(amenity)
        );
      });
    }

    res.json({
      success: true,
      data: properties,
      pagination: {
        page,
        pageSize,
        totalItems: properties.length,
        totalPages: Math.ceil(properties.length / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching properties', 
      error: error.message 
    });
  }
});

// Get property types
app.get('/api/property-types', async (req, res) => {
  try {
    const snapshot = await db.collection('propertyTypes').get();
    const types = [];
    
    snapshot.forEach(doc => {
      types.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Error fetching property types:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching property types', 
      error: error.message 
    });
  }
});

// Get amenities
app.get('/api/amenities', async (req, res) => {
  try {
    const snapshot = await db.collection('amenities').get();
    const amenities = [];
    
    snapshot.forEach(doc => {
      amenities.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ success: true, data: amenities });
  } catch (error) {
    console.error('Error fetching amenities:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching amenities', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running with Firebase' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;