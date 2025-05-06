import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Fetches properties with filtering
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @param {Object} sorting - Sorting options
 * @returns {Promise<{properties: Array, lastVisible: Object}>}
 */
export async function fetchProperties(filters = {}, pagination = {}, sorting = {}) {
  try {
    const propertiesRef = collection(db, 'properties');
    let constraints = [];

    // Apply filters
    if (filters.minPrice) {
      constraints.push(where('price', '>=', parseFloat(filters.minPrice)));
    }

    if (filters.maxPrice) {
      constraints.push(where('price', '<=', parseFloat(filters.maxPrice)));
    }

    if (filters.minSquareFeet) {
      constraints.push(where('squareFeet', '>=', parseInt(filters.minSquareFeet)));
    }

    if (filters.maxSquareFeet) {
      constraints.push(where('squareFeet', '<=', parseInt(filters.maxSquareFeet)));
    }

    if (filters.minBedrooms) {
      constraints.push(where('bedrooms', '>=', parseInt(filters.minBedrooms)));
    }

    if (filters.minBathrooms) {
      constraints.push(where('bathrooms', '>=', parseFloat(filters.minBathrooms)));
    }

    if (filters.propertyType && filters.propertyType.length) {
      constraints.push(where('propertyType', 'in', filters.propertyType));
    }

    // Apply sorting
    const { sortBy = 'createdAt', sortDirection = 'desc' } = sorting;
    constraints.push(orderBy(sortBy, sortDirection));

    // Apply pagination
    const { pageSize = 20, lastVisible } = pagination;
    constraints.push(limit(pageSize));

    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }

    // Create the query
    let propertyQuery = query(propertiesRef, ...constraints);
    
    // Execute the query
    const snapshot = await getDocs(propertyQuery);
    
    // Get the last document for pagination
    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
    
    // Format the results
    const properties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Handle amenities and location filtering client-side
    // (Firestore doesn't support array contains any + other filters well)
    let filteredProperties = properties;
    
    // Filter by amenities
    if (filters.amenities && filters.amenities.length) {
      filteredProperties = filteredProperties.filter(property => {
        const propertyAmenities = property.amenities || [];
        return filters.amenities.every(amenity => 
          propertyAmenities.includes(amenity)
        );
      });
    }
    
    // Filter by location (city or zipcode)
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filteredProperties = filteredProperties.filter(property => 
        property.city.toLowerCase().includes(locationLower) || 
        property.zipcode === filters.location
      );
    }

    return {
      properties: filteredProperties,
      lastVisible: lastVisibleDoc
    };
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
}

/**
 * Gets a property by ID
 * @param {string} id - Property ID
 * @returns {Promise<Object>}
 */
export async function getPropertyById(id) {
  try {
    const propertyDoc = await getDoc(doc(db, 'properties', id));
    
    if (!propertyDoc.exists()) {
      throw new Error('Property not found');
    }
    
    return {
      id: propertyDoc.id,
      ...propertyDoc.data()
    };
  } catch (error) {
    console.error(`Error fetching property with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Fetches property types
 * @returns {Promise<Array>}
 */
export async function fetchPropertyTypes() {
  try {
    const typesSnapshot = await getDocs(collection(db, 'propertyTypes'));
    
    return typesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching property types:', error);
    throw error;
  }
}

/**
 * Fetches amenities
 * @returns {Promise<Array>}
 */
export async function fetchAmenities() {
  try {
    const amenitiesSnapshot = await getDocs(collection(db, 'amenities'));
    
    return amenitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching amenities:', error);
    throw error;
  }
}