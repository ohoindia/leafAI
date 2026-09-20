CREATE DATABASE IF NOT EXISTS leaf_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE leaf_ai;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
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
