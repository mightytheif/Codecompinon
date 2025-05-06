const pool = require('../config/database');

/**
 * Searches for properties matching filter criteria
 * @param {Object} filters - Filter parameters
 * @param {Object} pagination - Pagination options
 * @param {Object} sorting - Sorting options
 * @returns {Promise<{properties: Array, total: number}>}
 */
async function searchProperties(filters = {}, pagination = {}, sorting = {}) {
  try {
    // Build the base query
    let query = `
      SELECT p.*, l.city, l.state, l.zipcode, l.latitude, l.longitude, pt.name as property_type,
        (SELECT COALESCE(json_agg(a.name), '[]'::json)
         FROM property_amenities pa
         JOIN amenities a ON pa.amenity_id = a.id
         WHERE pa.property_id = p.id) as amenities
      FROM properties p
      JOIN locations l ON p.id = l.property_id
      JOIN property_types pt ON p.property_type_id = pt.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Add filter conditions
    if (filters.minPrice) {
      query += ` AND p.price >= $${paramCount++}`;
      queryParams.push(filters.minPrice);
    }
    
    if (filters.maxPrice) {
      query += ` AND p.price <= $${paramCount++}`;
      queryParams.push(filters.maxPrice);
    }
    
    if (filters.minSquareFeet) {
      query += ` AND p.square_feet >= $${paramCount++}`;
      queryParams.push(filters.minSquareFeet);
    }
    
    if (filters.maxSquareFeet) {
      query += ` AND p.square_feet <= $${paramCount++}`;
      queryParams.push(filters.maxSquareFeet);
    }
    
    if (filters.minBedrooms) {
      query += ` AND p.bedrooms >= $${paramCount++}`;
      queryParams.push(filters.minBedrooms);
    }
    
    if (filters.minBathrooms) {
      query += ` AND p.bathrooms >= $${paramCount++}`;
      queryParams.push(filters.minBathrooms);
    }
    
    // Location filtering (city/zipcode)
    if (filters.location) {
      query += ` AND (l.city ILIKE $${paramCount++} OR l.zipcode = $${paramCount++})`;
      queryParams.push(`%${filters.location}%`, filters.location);
    }
    
    // Property type filtering
    if (filters.propertyType && filters.propertyType.length > 0) {
      query += ` AND pt.name = ANY($${paramCount++})`;
      queryParams.push(filters.propertyType);
    }
    
    // Amenities filtering
    if (filters.amenities && filters.amenities.length > 0) {
      query += ` AND p.id IN (
        SELECT property_id 
        FROM property_amenities pa
        JOIN amenities a ON pa.amenity_id = a.id
        WHERE a.name = ANY($${paramCount++})
        GROUP BY property_id
        HAVING COUNT(DISTINCT a.id) >= $${paramCount++}
      )`;
      queryParams.push(filters.amenities, filters.amenities.length);
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total_count`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting
    const { sortBy = 'created_at', sortDirection = 'DESC' } = sorting;
    const validSortFields = ['price', 'square_feet', 'created_at', 'bedrooms', 'bathrooms'];
    const validSortDirections = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = validSortDirections.includes(sortDirection.toUpperCase()) 
      ? sortDirection.toUpperCase() 
      : 'DESC';
      
    query += ` ORDER BY p.${sortField} ${sortDir}`;
    
    // Add pagination
    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;
    
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(pageSize, offset);
    
    // Execute the query
    const result = await pool.query(query, queryParams);
    
    return {
      properties: result.rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Error searching properties:', error);
    throw error;
  }
}

/**
 * Gets available property types
 * @returns {Promise<Array>}
 */
async function getPropertyTypes() {
  try {
    const query = 'SELECT id, name, description FROM property_types ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching property types:', error);
    throw error;
  }
}

/**
 * Gets available amenities
 * @returns {Promise<Array>}
 */
async function getAmenities() {
  try {
    const query = 'SELECT id, name, description FROM amenities ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching amenities:', error);
    throw error;
  }
}

/**
 * Gets available locations (cities and states)
 * @returns {Promise<Array>}
 */
async function getLocations() {
  try {
    const query = `
      SELECT DISTINCT city, state 
      FROM locations
      ORDER BY state, city
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
}

module.exports = {
  searchProperties,
  getPropertyTypes,
  getAmenities,
  getLocations
};