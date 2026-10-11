-- Run against existing databases before deploying language support.
ALTER TABLE users MODIFY preferred_language ENUM('en','te','hi','kn','ta') NOT NULL DEFAULT 'en';
ALTER TABLE leaf_analyses MODIFY requested_language ENUM('en','te','hi','kn','ta') NOT NULL;
ALTER TABLE voice_commands MODIFY language_code ENUM('en','te','hi','kn','ta') NOT NULL;
