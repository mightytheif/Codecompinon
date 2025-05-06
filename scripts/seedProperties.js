import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account from file
const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://sakany10-default-rtdb.firebaseio.com"
});

const db = getFirestore();

// Sample property types
const propertyTypes = [
  { name: 'House', description: 'Single-family detached dwelling' },
  { name: 'Apartment', description: 'Unit in multi-unit building' },
  { name: 'Condo', description: 'Individually owned unit in a building or community' },
  { name: 'Townhouse', description: 'Multi-floor home that shares walls with adjacent properties' },
  { name: 'Land', description: 'Undeveloped property' }
];

// Sample amenities
const amenities = [
  { name: 'Pool', description: 'Swimming pool' },
  { name: 'Garage', description: 'Enclosed vehicle storage' },
  { name: 'Garden', description: 'Outdoor garden space' },
  { name: 'Balcony', description: 'Elevated outdoor platform' },
  { name: 'Parking', description: 'Dedicated parking space' },
  { name: 'Gym', description: 'Exercise facility' }
];

// Sample cities with coordinates
const cities = [
  { city: 'Austin', state: 'TX', latitude: 30.267153, longitude: -97.743057 },
  { city: 'Denver', state: 'CO', latitude: 39.739236, longitude: -104.990251 },
  { city: 'Seattle', state: 'WA', latitude: 47.608013, longitude: -122.335167 },
  { city: 'Miami', state: 'FL', latitude: 25.761681, longitude: -80.191788 },
  { city: 'Boston', state: 'MA', latitude: 42.361145, longitude: -71.057083 }
];

// Generate random properties
function generateProperties(count) {
  const properties = [];
  
  for (let i = 0; i < count; i++) {
    // Select a random city
    const cityData = cities[Math.floor(Math.random() * cities.length)];
    
    // Select a random property type
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)].name;
    
    // Generate random number of bedrooms and bathrooms
    const bedrooms = Math.floor(Math.random() * 5) + 1;
    const bathrooms = Math.floor(Math.random() * 4) + 1;
    
    // Generate random square footage
    const squareFeet = Math.floor(Math.random() * 3000) + 500;
    
    // Generate random price based on bedrooms and square footage
    const basePrice = 100000;
    const bedroomValue = 50000;
    const sqftValue = 200;
    const price = basePrice + (bedrooms * bedroomValue) + (squareFeet * sqftValue);
    
    // Select random amenities (between 0 and all amenities)
    const numAmenities = Math.floor(Math.random() * (amenities.length + 1));
    const shuffledAmenities = [...amenities].sort(() => 0.5 - Math.random());
    const propertyAmenities = shuffledAmenities.slice(0, numAmenities).map(a => a.name);
    
    // Generate zipcode (fake)
    const zipcode = String(Math.floor(Math.random() * 89999) + 10000);
    
    // Create the property
    properties.push({
      title: `${bedrooms} Bed ${propertyType} in ${cityData.city}`,
      description: `Beautiful ${bedrooms} bedroom ${propertyType.toLowerCase()} with ${bathrooms} bathrooms and ${squareFeet} square feet of living space.`,
      price,
      squareFeet,
      bedrooms,
      bathrooms,
      propertyType,
      amenities: propertyAmenities,
      city: cityData.city,
      state: cityData.state,
      zipcode,
      latitude: cityData.latitude + (Math.random() * 0.1 - 0.05),
      longitude: cityData.longitude + (Math.random() * 0.1 - 0.05),
      imageUrl: `https://source.unsplash.com/random/800x600?${propertyType.toLowerCase()},house`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return properties;
}

// Add data to Firestore
async function seedDatabase() {
  console.log('Starting database seeding...');
  
  // Add property types
  console.log('Adding property types...');
  for (const type of propertyTypes) {
    await db.collection('propertyTypes').add(type);
  }
  
  // Add amenities
  console.log('Adding amenities...');
  for (const amenity of amenities) {
    await db.collection('amenities').add(amenity);
  }
  
  // Generate and add properties
  console.log('Generating properties...');
  const properties = generateProperties(50);
  
  // Add properties in batches
  console.log('Adding properties...');
  const batch = db.batch();
  let batchCount = 0;
  const batchSize = 500;
  const propertyRefs = [];
  
  for (let i = 0; i < properties.length; i++) {
    const propertyRef = db.collection('properties').doc();
    propertyRefs.push(propertyRef);
    batch.set(propertyRef, properties[i]);
    batchCount++;
    
    if (batchCount >= batchSize || i === properties.length - 1) {
      await batch.commit();
      console.log(`Committed batch of ${batchCount} properties`);
      batchCount = 0;
    }
  }
  
  console.log(`Added ${properties.length} properties`);
  console.log('Database seeding completed successfully');
  
  // Exit the process
  process.exit(0);
}

seedDatabase()
  .catch(error => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });