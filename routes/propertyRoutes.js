const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

// Get filtered properties
router.get('/properties', propertyController.getFilteredProperties);

// Get property types
router.get('/property-types', propertyController.getPropertyTypes);

// Get amenities
router.get('/amenities', propertyController.getAmenities);

// Get locations
router.get('/locations', propertyController.getLocations);

module.exports = router;