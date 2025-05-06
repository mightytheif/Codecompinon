const propertyService = require('../services/propertyFilterService');

/**
 * Get filtered properties
 */
async function getFilteredProperties(req, res) {
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
      maxBedrooms: req.query.maxBedrooms ? parseInt(req.query.maxBedrooms) : null,
      minBathrooms: req.query.minBathrooms ? parseInt(req.query.minBathrooms) : null,
      maxBathrooms: req.query.maxBathrooms ? parseInt(req.query.maxBathrooms) : null,
      amenities: req.query.amenities ? req.query.amenities.split(',') : null,
    };

    // Extract pagination parameters
    const pagination = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 20
    };

    // Extract sorting parameters
    const sorting = {
      sortBy: req.query.sortBy || 'created_at',
      sortDirection: req.query.sortDirection || 'DESC'
    };

    const result = await propertyService.searchProperties(filters, pagination, sorting);
    
    res.json({
      success: true,
      data: result.properties,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error in getFilteredProperties:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get property types
 */
async function getPropertyTypes(req, res) {
  try {
    const types = await propertyService.getPropertyTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Error in getPropertyTypes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get amenities
 */
async function getAmenities(req, res) {
  try {
    const amenities = await propertyService.getAmenities();
    res.json({ success: true, data: amenities });
  } catch (error) {
    console.error('Error in getAmenities:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get locations
 */
async function getLocations(req, res) {
  try {
    const locations = await propertyService.getLocations();
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Error in getLocations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  getFilteredProperties,
  getPropertyTypes,
  getAmenities,
  getLocations
};