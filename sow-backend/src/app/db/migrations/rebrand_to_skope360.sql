-- Migration: Update email domain from @skope.ai to @skope360.ai
-- Purpose: Rebrand from SKOPE to SKOPE360
-- Date: 2025-11-28

-- Update all email addresses
UPDATE users 
SET email = REPLACE(email, '@skope.ai', '@skope360.ai')
WHERE email LIKE '%@skope.ai';
