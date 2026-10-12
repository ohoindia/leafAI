-- Text-backed boolean: only 'true' enables subscription enforcement.
INSERT IGNORE INTO ConfigValues (ConfigKey,ConfigValue) VALUES ('EnableSubscription','false');
-- Placeholders only. Preserve existing credentials when this migration is repeated.
INSERT IGNORE INTO ConfigSecrets (ConfigKey,ConfigValue) VALUES
('RAZORPAY_KEY_ID',''),
('RAZORPAY_KEY_SECRET',''),
('RAZORPAY_WEBHOOK_SECRET',''),
('RAZORPAY_MONTHLY_PLAN_ID',''),
('RAZORPAY_YEARLY_PLAN_ID','');
