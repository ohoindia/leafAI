-- Apply once to existing databases before starting the updated server.
ALTER TABLE leaf_analyses
  ADD COLUMN provided_plant_name VARCHAR(150) NULL AFTER plant_name,
  ADD COLUMN plant_location VARCHAR(255) NULL AFTER provided_plant_name;
