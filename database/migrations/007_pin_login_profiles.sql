ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL, MODIFY COLUMN password_hash VARCHAR(255) NULL, ADD COLUMN mobile_verified_at DATETIME(3) NULL;
-- Preserve completed OTP/PIN profiles from the earlier flow.
UPDATE users u JOIN (SELECT user_id,MobileNumber,MAX(verified_at) verified_at FROM MobileOTPHistory WHERE verified_at IS NOT NULL AND consumed_at IS NOT NULL GROUP BY user_id,MobileNumber) o ON o.user_id=u.id AND o.MobileNumber=u.mobile_number SET u.mobile_verified_at=o.verified_at WHERE u.pin_hash IS NOT NULL;
ALTER TABLE MobileOTPHistory ADD COLUMN purpose ENUM('REGISTRATION','PIN_RESET') NOT NULL DEFAULT 'REGISTRATION';
