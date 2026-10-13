CREATE TABLE IF NOT EXISTS market_states (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_market_state (name)
);
CREATE TABLE IF NOT EXISTS market_districts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  state_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_market_district (state_id,name),
  FOREIGN KEY (state_id) REFERENCES market_states(id)
);
CREATE TABLE IF NOT EXISTS market_mandis (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  district_id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  UNIQUE KEY uq_market_mandi (district_id,name),
  KEY ix_market_coordinates (latitude,longitude),
  FOREIGN KEY (district_id) REFERENCES market_districts(id)
);
CREATE TABLE IF NOT EXISTS market_commodities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  commodity_key VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_market_commodity (name),
  KEY ix_market_commodity_key (commodity_key)
);
CREATE TABLE IF NOT EXISTS market_varieties (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commodity_id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_market_variety (commodity_id,name),
  FOREIGN KEY (commodity_id) REFERENCES market_commodities(id)
);
CREATE TABLE IF NOT EXISTS market_grades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_market_grade (name)
);
CREATE TABLE IF NOT EXISTS market_prices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mandi_id INT UNSIGNED NOT NULL,
  variety_id INT UNSIGNED NOT NULL,
  grade_id INT UNSIGNED NOT NULL,
  report_date DATE NOT NULL,
  min_price DECIMAL(14,2) NULL,
  max_price DECIMAL(14,2) NULL,
  modal_price DECIMAL(14,2) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_market_report (mandi_id,variety_id,grade_id,report_date),
  KEY ix_market_report_date (report_date),
  FOREIGN KEY (mandi_id) REFERENCES market_mandis(id),
  FOREIGN KEY (variety_id) REFERENCES market_varieties(id),
  FOREIGN KEY (grade_id) REFERENCES market_grades(id)
);
CREATE TABLE IF NOT EXISTS market_import_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mode ENUM('bootstrap','refresh') NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status ENUM('running','success','failed') NOT NULL DEFAULT 'running',
  records_received INT UNSIGNED NOT NULL DEFAULT 0,
  records_inserted INT UNSIGNED NOT NULL DEFAULT 0,
  records_updated INT UNSIGNED NOT NULL DEFAULT 0,
  records_unchanged INT UNSIGNED NOT NULL DEFAULT 0,
  records_outside_window INT UNSIGNED NOT NULL DEFAULT 0,
  earliest_report DATE NULL,
  latest_report DATE NULL,
  historical_backfill_complete BOOLEAN NOT NULL DEFAULT FALSE,
  error_message VARCHAR(500) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  finished_at DATETIME(3) NULL,
  KEY ix_market_import_status (status,id)
);
