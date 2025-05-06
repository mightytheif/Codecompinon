CREATE TABLE Properties (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    square_feet INTEGER NOT NULL,
    bedrooms SMALLINT NOT NULL,
    bathrooms SMALLINT NOT NULL,
    property_type_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_type_id) REFERENCES PropertyTypes(id)
);

CREATE TABLE Locations (
    id UUID PRIMARY KEY,
    property_id UUID NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zipcode VARCHAR(20) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    FOREIGN KEY (property_id) REFERENCES Properties(id)
);

CREATE TABLE PropertyTypes (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE Amenities (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE PropertyAmenities (
    property_id UUID NOT NULL,
    amenity_id UUID NOT NULL,
    PRIMARY KEY (property_id, amenity_id),
    FOREIGN KEY (property_id) REFERENCES Properties(id),
    FOREIGN KEY (amenity_id) REFERENCES Amenities(id)
);

-- Indexes for filter optimization
CREATE INDEX idx_properties_price ON Properties(price);
CREATE INDEX idx_properties_square_feet ON Properties(square_feet);
CREATE INDEX idx_properties_bedrooms ON Properties(bedrooms);
CREATE INDEX idx_properties_bathrooms ON Properties(bathrooms);
CREATE INDEX idx_properties_type ON Properties(property_type_id);
CREATE INDEX idx_locations_city ON Locations(city);
CREATE INDEX idx_locations_zipcode ON Locations(zipcode);
CREATE INDEX idx_locations_coordinates ON Locations(latitude, longitude);