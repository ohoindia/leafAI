ALTER TABLE users ADD COLUMN mobile_number VARCHAR(10) NULL, ADD COLUMN pin_hash VARCHAR(255) NULL, ADD UNIQUE KEY uq_users_mobile (mobile_number);
-- Backfill only unique, valid Indian mobile numbers; resolve duplicates manually.
UPDATE users u JOIN (SELECT JSON_UNQUOTE(JSON_EXTRACT(user_details,'$.phone')) phone FROM users GROUP BY phone HAVING COUNT(*)=1) p ON JSON_UNQUOTE(JSON_EXTRACT(u.user_details,'$.phone'))=p.phone SET u.mobile_number=p.phone WHERE p.phone REGEXP '^[6-9][0-9]{9}$';
CREATE TABLE ConfigValues (ConfigKey VARCHAR(100) PRIMARY KEY, ConfigValue TEXT NOT NULL);
CREATE TABLE ConfigSecrets (ConfigKey VARCHAR(100) PRIMARY KEY, ConfigValue TEXT NOT NULL);
INSERT INTO ConfigValues VALUES ('OTP_SEND_ENABLED','true'),('SMS_PROVIDER','msg91'),('MSG91_OTP_URL','https://control.msg91.com/api/v5/flow'),('MSG91_OTP_TEMPLATE_ID','');
CREATE TABLE MobileOTPHistory (
 GUID CHAR(36) PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, MobileNumber VARCHAR(10) NOT NULL,
 OTPGenerated JSON NOT NULL, otp_hash VARCHAR(255) NOT NULL, GeneratedOn DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 ExpiredOTPOn DATETIME(3) NOT NULL, attempts INT NOT NULL DEFAULT 0, verified_at DATETIME(3) NULL,
 consumed_at DATETIME(3) NULL, full_name VARCHAR(150) NULL,
 INDEX ix_otp_user_time(user_id,GeneratedOn), FOREIGN KEY(user_id) REFERENCES users(id)
);
