import React from 'react';

const PropertyCard = ({ property }) => {
  return (
    <div className="property-card">
      <div className="property-image">
        <img 
          src={property.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
          alt={property.title}
        />
      </div>
      
      <div className="property-details">
        <h3 className="property-title">{property.title}</h3>
        <div className="property-location">{property.city}, {property.state}</div>
        <div className="property-price">${property.price.toLocaleString()}</div>
        
        <div className="property-specs">
          <span>{property.bedrooms} bd</span>
          <span>{property.bathrooms} ba</span>
          <span>{property.square_feet.toLocaleString()} sqft</span>
        </div>
        
        <div className="property-type">{property.property_type}</div>
        
        {property.amenities && property.amenities.length > 0 && (
          <div className="property-amenities">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <span key={index} className="amenity-tag">{amenity}</span>
            ))}
            {property.amenities.length > 3 && (
              <span className="amenity-more">+{property.amenities.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;