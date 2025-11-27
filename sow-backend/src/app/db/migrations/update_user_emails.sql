-- Migration: Update user email addresses to match names
-- Purpose: Change email addresses from generic ones to user names
-- Date: 2025-11-28

-- Update email addresses
UPDATE users SET email = 'sushas@skope.ai' WHERE email = 'admin@skope.ai';
UPDATE users SET email = 'susmita@skope.ai' WHERE email = 'manager@skope.ai';
UPDATE users SET email = 'shishir@skope.ai' WHERE email = 'analyst@skope.ai';
UPDATE users SET email = 'shilpa@skope.ai' WHERE email = 'viewer@skope.ai';
UPDATE users SET email = 'malleha@skope.ai' WHERE email = 'john.doe@skope.ai';
