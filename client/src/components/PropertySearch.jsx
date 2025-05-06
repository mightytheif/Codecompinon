import React, { useState, useEffect } from 'react';
import { fetchProperties, fetchPropertyTypes, fetchAmenities } from '../services/propertyService';
import PropertyFilterForm from './PropertyFilterForm';
import PropertyCard from './PropertyCard';

const PropertySearch = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});

  // Load property types and amenities on component mount
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [typesData, amenitiesData] = await Promise.all([
          fetchPropertyTypes(),
          fetchAmenities()
        ]);
        
        setPropertyTypes(typesData);
        setAmenities(amenitiesData);
      } catch (err) {
        console.error('Error loading filter data:', err);
        setError('Failed to load filter options. Please refresh and try again.');
      }
    };
    
    loadFilterData();
  }, []);

  // Handle filter submission
  const handleFilterSubmit = async (filters) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(filters);
    setLastVisible(null); // Reset pagination when filters change
    
    try {
      const result = await fetchProperties(filters, { pageSize: 20 });
      
      setProperties(result.properties);
      setLastVisible(result.lastVisible);
      setHasMore(result.properties.length === 20);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load more properties (pagination)
  const loadMoreProperties = async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    
    try {
      const result = await fetchProperties(
        currentFilters,
        { pageSize: 20, lastVisible }
      );
      
      setProperties(prevProperties => [...prevProperties, ...result.properties]);
      setLastVisible(result.lastVisible);
      setHasMore(result.properties.length === 20);
    } catch (err) {
      console.error('Error fetching more properties:', err);
      setError('Failed to load more properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="property-search-container">
      <div className="filter-sidebar">
        <h2>Find Your Dream Property</h2>
        <PropertyFilterForm 
          onFilterSubmit={handleFilterSubmit}
          propertyTypes={propertyTypes.map(type => type.name)} 
          amenities={amenities.map(amenity => amenity.name)}
        />
      </div>
      
      <div className="properties-results">
        <div className="results-header">
          {loading && properties.length === 0 ? (
            <p>Loading properties...</p>
          ) : (
            <h3>{properties.length} Properties Found</h3>
          )}
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <div className="properties-grid">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
        
        {properties.length === 0 && !loading && (
          <div className="no-results">
            <h3>No properties match your search criteria</h3>
            <p>Try adjusting your filters to see more properties.</p>
          </div>
        )}
        
        {hasMore && (
          <div className="load-more">
            <button 
              onClick={loadMoreProperties}
              disabled={loading}
              className="load-more-button"
            >
              {loading ? 'Loading...' : 'Load More Properties'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertySearch;