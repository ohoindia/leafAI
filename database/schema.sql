CREATE DATABASE IF NOT EXISTS leaf_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE leaf_ai;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mobile_number VARCHAR(10) NULL,
  pin_hash VARCHAR(255) NULL,
  mobile_verified_at DATETIME(3) NULL,
  UNIQUE KEY uq_users_mobile (mobile_number),
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  full_name VARCHAR(150) NOT NULL,
  user_details JSON NULL,
  profile_photo JSON NULL,
  preferred_language ENUM('en','te','hi') NOT NULL DEFAULT 'en',
  role ENUM('USER','AGRONOMIST','ADMIN') NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS FarmDetails (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  farm_name VARCHAR(300) NULL,
  phone VARCHAR(300) NULL,
  village VARCHAR(300) NULL,
  district VARCHAR(300) NULL,
  state VARCHAR(300) NULL,
  country VARCHAR(300) NULL,
  postal_code VARCHAR(300) NULL,
  latitude DECIMAL(12,8) NULL,
  longitude DECIMAL(12,8) NULL,
  area DECIMAL(18,6) NULL,
  area_unit VARCHAR(300) NULL,
  ownership VARCHAR(300) NULL,
  soil_type VARCHAR(300) NULL,
  soil_ph DECIMAL(4,2) NULL,
  soil_test_date DATE NULL,
  water_source VARCHAR(300) NULL,
  irrigation VARCHAR(300) NULL,
  drainage VARCHAR(300) NULL,
  farming_method VARCHAR(300) NULL,
  other_crops TEXT NULL,
  weather TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_farm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY ix_farm_user (user_id)
);

CREATE TABLE IF NOT EXISTS farm_crops (
  id CHAR(36) PRIMARY KEY,
  farm_id CHAR(36) NOT NULL,
  status ENUM('CURRENT','PREVIOUS') NOT NULL,
  present_crop VARCHAR(300) NULL,
  present_variety VARCHAR(300) NULL,
  season VARCHAR(300) NULL,
  sowing_date DATE NULL,
  harvest_date DATE NULL,
  crop_area DECIMAL(18,6) NULL,
  growth_stage VARCHAR(300) NULL,
  seed_source VARCHAR(300) NULL,
  spacing VARCHAR(300) NULL,
  irrigation_schedule VARCHAR(300) NULL,
  fertilizers TEXT NULL,
  pesticides TEXT NULL,
  current_issues TEXT NULL,
  yield_amount VARCHAR(300) NULL,
  treatment TEXT NULL,
  residue_management TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_crop_farm FOREIGN KEY (farm_id) REFERENCES FarmDetails(id) ON DELETE CASCADE,
  KEY ix_crop_farm (farm_id,status,created_at)
);

CREATE TABLE login_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  email_attempted VARCHAR(255) NULL,
  event_type ENUM('LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','TOKEN_REFRESH','ACCOUNT_LOCKED') NOT NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(512) NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY ix_login_user_time (user_id, occurred_at DESC)
);

CREATE TABLE user_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_refresh_hash (refresh_token_hash),
  KEY ix_session_user_active (user_id, revoked_at, expires_at)
);

CREATE TABLE leaf_uploads (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  encryption_iv CHAR(24) NOT NULL,
  encryption_tag CHAR(32) NOT NULL,
  consent_to_analyze BOOLEAN NOT NULL,
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_upload_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY ix_upload_user_time (user_id, uploaded_at DESC)
);

CREATE TABLE leaf_analyses (
  id CHAR(36) PRIMARY KEY,
  upload_id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  requested_language ENUM('en','te','hi') NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  model_response_id VARCHAR(150) NULL,
  status ENUM('PROCESSING','COMPLETED','FAILED','REVIEW_REQUIRED') NOT NULL DEFAULT 'PROCESSING',
  plant_name VARCHAR(255) NULL,
  provided_plant_name VARCHAR(150) NULL,
  plant_location VARCHAR(255) NULL,
  disease_name VARCHAR(255) NULL,
  confidence DECIMAL(5,4) NULL,
  severity ENUM('UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'UNKNOWN',
  analysis_json JSON NULL,
  output_en JSON NULL,
  output_te JSON NULL,
  output_hi JSON NULL,
  prompt_version VARCHAR(30) NOT NULL,
  error_code VARCHAR(80) NULL,
  error_message VARCHAR(1000) NULL,
  processing_ms INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  CONSTRAINT fk_analysis_upload FOREIGN KEY (upload_id) REFERENCES leaf_uploads(id),
  CONSTRAINT fk_analysis_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY ix_analysis_user_time (user_id, created_at DESC),
  KEY ix_analysis_disease (disease_name)
);

CREATE TABLE voice_commands (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  analysis_id CHAR(36) NULL,
  language_code ENUM('en','te','hi') NOT NULL,
  transcript TEXT NOT NULL,
  detected_intent VARCHAR(80) NULL,
  was_successful BOOLEAN NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_voice_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_voice_analysis FOREIGN KEY (analysis_id) REFERENCES leaf_analyses(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100) NULL,
  request_id CHAR(36) NOT NULL,
  ip_address VARBINARY(16) NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY ix_audit_entity (entity_type, entity_id),
  KEY ix_audit_actor_time (actor_user_id, created_at DESC)
);

-- Create the first user through POST /api/auth/register, then disable public registration in production if desired.

CREATE TABLE ConfigValues (ConfigKey VARCHAR(100) PRIMARY KEY, ConfigValue TEXT NOT NULL);
CREATE TABLE ConfigSecrets (ConfigKey VARCHAR(100) PRIMARY KEY, ConfigValue TEXT NOT NULL);
INSERT INTO ConfigValues VALUES ('OTP_SEND_ENABLED','true'),('SMS_PROVIDER','msg91'),('MSG91_OTP_URL','https://control.msg91.com/api/v5/flow'),('MSG91_OTP_TEMPLATE_ID','');
CREATE TABLE MobileOTPHistory (
 GUID CHAR(36) PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, MobileNumber VARCHAR(10) NOT NULL,
 OTPGenerated JSON NOT NULL, GeneratedOn DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 ExpiredOTPOn DATETIME(3) NOT NULL, attempts INT NOT NULL DEFAULT 0, verified_at DATETIME(3) NULL,
 consumed_at DATETIME(3) NULL, full_name VARCHAR(150) NULL,
 purpose ENUM('REGISTRATION','PIN_RESET') NOT NULL DEFAULT 'REGISTRATION',
 INDEX ix_otp_user_time(user_id,GeneratedOn), FOREIGN KEY(user_id) REFERENCES users(id)
);
