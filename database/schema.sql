CREATE TABLE IF NOT EXISTS property_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    square_feet INTEGER NOT NULL,
    bedrooms SMALLINT NOT NULL,
    bathrooms NUMERIC(3, 1) NOT NULL,
    property_type_id UUID NOT NULL REFERENCES property_types(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zipcode VARCHAR(20) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    CONSTRAINT unique_property_location UNIQUE (property_id)
);

CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS property_amenities (
    property_id UUID NOT NULL REFERENCES properties(id),
    amenity_id UUID NOT NULL REFERENCES amenities(id),
    PRIMARY KEY (property_id, amenity_id)
);

-- Create indexes for filtering optimization
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_square_feet ON properties(square_feet);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_bathrooms ON properties(bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type_id);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_zipcode ON locations(zipcode);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);

-- Insert sample property types
INSERT INTO property_types (name, description) VALUES 
('House', 'Single-family detached dwelling'),
('Apartment', 'Unit in multi-unit building'),
('Condo', 'Individually owned unit in a building or community'),
('Townhouse', 'Multi-floor home that shares walls with adjacent properties'),
('Land', 'Undeveloped property')
ON CONFLICT (name) DO NOTHING;

-- Insert sample amenities
INSERT INTO amenities (name, description) VALUES 
('Pool', 'Swimming pool'),
('Garage', 'Enclosed vehicle storage'),
('Garden', 'Outdoor garden space'),
('Balcony', 'Elevated outdoor platform'),
('Parking', 'Dedicated parking space'),
('Gym', 'Exercise facility')
ON CONFLICT (name) DO NOTHING;