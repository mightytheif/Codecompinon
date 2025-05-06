import React, { useState } from 'react';

const PropertyFilterForm = ({ onFilterSubmit, propertyTypes = [], amenities = [] }) => {
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    location: '',
    minSquareFeet: '',
    maxSquareFeet: '',
    propertyType: [],
    minBedrooms: '',
    maxBedrooms: '',
    minBathrooms: '',
    maxBathrooms: '',
    amenities: []
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    if (checked) {
      setFilters(prev => ({ ...prev, [name]: [...prev[name], value] }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: prev[name].filter(item => item !== value)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilterSubmit(filters);
  };

  const handleReset = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      location: '',
      minSquareFeet: '',
      maxSquareFeet: '',
      propertyType: [],
      minBedrooms: '',
      maxBedrooms: '',
      minBathrooms: '',
      maxBathrooms: '',
      amenities: []
    });
    onFilterSubmit({}); // Submit with empty filters to show all properties
  };

  return (
    <div className="property-filter-container">
      <form onSubmit={handleSubmit} className="property-filter-form">
        <div className="filter-section">
          <h3>Price Range</h3>
          <div className="filter-row">
            <div className="filter-item">
              <label htmlFor="minPrice">Min Price ($)</label>
              <input
                type="number"
                id="minPrice"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleChange}
              />
            </div>
            <div className="filter-item">
              <label htmlFor="maxPrice">Max Price ($)</label>
              <input
                type="number"
                id="maxPrice"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="filter-section">
          <h3>Location</h3>
          <div className="filter-item">
            <label htmlFor="location">City or Zip Code</label>
            <input
              type="text"
              id="location"
              name="location"
              value={filters.location}
              onChange={handleChange}
              placeholder="Enter city or zip code"
            />
          </div>
        </div>

        <div className="filter-section">
          <h3>Property Details</h3>
          <div className="filter-row">
            <div className="filter-item">
              <label htmlFor="minSquareFeet">Min Square Feet</label>
              <input
                type="number"
                id="minSquareFeet"
                name="minSquareFeet"
                value={filters.minSquareFeet}
                onChange={handleChange}
              />
            </div>
            <div className="filter-item">
              <label htmlFor="maxSquareFeet">Max Square Feet</label>
              <input
                type="number"
                id="maxSquareFeet"
                name="maxSquareFeet"
                value={filters.maxSquareFeet}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="filter-section">
          <h3>Bedrooms & Bathrooms</h3>
          <div className="filter-row">
            <div className="filter-item">
              <label htmlFor="minBedrooms">Min Bedrooms</label>
              <select
                id="minBedrooms"
                name="minBedrooms"
                value={filters.minBedrooms}
                onChange={handleChange}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
            <div className="filter-item">
              <label htmlFor="minBathrooms">Min Bathrooms</label>
              <select
                id="minBathrooms"
                name="minBathrooms"
                value={filters.minBathrooms}
                onChange={handleChange}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="1.5">1.5+</option>
                <option value="2">2+</option>
                <option value="2.5">2.5+</option>
                <option value="3">3+</option>
              </select>
            </div>
          </div>
        </div>

        <div className="filter-section">
          <h3>Property Type</h3>
          <div className="checkbox-group">
            {propertyTypes.map(type => (
              <div key={type} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`type-${type}`}
                  name="propertyType"
                  value={type}
                  checked={filters.propertyType.includes(type)}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor={`type-${type}`}>{type}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3>Amenities</h3>
          <div className="checkbox-group">
            {amenities.map(amenity => (
              <div key={amenity} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`amenity-${amenity}`}
                  name="amenities"
                  value={amenity}
                  checked={filters.amenities.includes(amenity)}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor={`amenity-${amenity}`}>{amenity}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="filter-action">
          <button type="submit" className="filter-button">Search Properties</button>
          <button 
            type="button" 
            className="filter-reset" 
            onClick={handleReset}
          >
            Reset Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default PropertyFilterForm;

// Sample properties collection
const properties = [
  {
    id: "property1",
    title: "Modern Downtown Apartment",
    description: "A beautiful apartment in downtown with great views",
    price: 350000,
    squareFeet: 1200,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: "Apartment",
    amenities: ["Balcony", "Parking", "Gym"],
    city: "Austin",
    state: "TX",
    zipcode: "78701",
    latitude: 30.267153,
    longitude: -97.743057,
    imageUrl: "https://example.com/apartment.jpg",
    createdAt: Timestamp,
    updatedAt: Timestamp
  },
  // More properties...
];

// Property types collection
const propertyTypesCollection = [
  { id: "type1", name: "House" },
  { id: "type2", name: "Apartment" },
  { id: "type3", name: "Condo" },
  { id: "type4", name: "Townhouse" },
  { id: "type5", name: "Land" }
];

// Amenities collection
const amenitiesCollection = [
  { id: "amen1", name: "Pool" },
  { id: "amen2", name: "Garage" },
  { id: "amen3", name: "Garden" },
  { id: "amen4", name: "Balcony" },
  { id: "amen5", name: "Parking" },
  { id: "amen6", name: "Gym" }
];