-- Migration: Add user profile fields
-- Purpose: Add job title, department, and experience fields to users
-- Date: 2025-11-28

-- Add profile columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Update existing users with profile information

-- Sushas - SME (Subject Matter Expert)
UPDATE users 
SET 
    full_name = 'Sushas',
    job_title = 'Subject Matter Expert',
    department = 'Business Operations',
    years_of_experience = 20,
    bio = 'Seasoned SME with over 20 years of expertise in business process optimization and SOW analysis. Specializes in compliance, risk assessment, and strategic vendor management.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Sushas&background=2065D1&color=fff&size=128'
WHERE email = 'admin@skope.ai';

-- Susmita - BA and Project Manager
UPDATE users 
SET 
    full_name = 'Susmita',
    job_title = 'Business Analyst & Project Manager',
    department = 'Project Management',
    years_of_experience = 22,
    bio = 'Experienced BA and PM with 22+ years leading complex procurement projects. Expert in requirements gathering, stakeholder management, and agile methodologies.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Susmita&background=7635DC&color=fff&size=128'
WHERE email = 'manager@skope.ai';

-- Shishir - Tech Lead
UPDATE users 
SET 
    full_name = 'Shishir',
    job_title = 'Technical Lead',
    department = 'Engineering',
    years_of_experience = 20,
    bio = 'Technical leader with 20 years of experience in software architecture, AI/ML integration, and cloud solutions. Leads the development of intelligent document analysis systems.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Shishir&background=0C7C59&color=fff&size=128'
WHERE email = 'analyst@skope.ai';

-- Shilpa - Tech Lead
UPDATE users 
SET 
    full_name = 'Shilpa',
    job_title = 'Technical Lead',
    department = 'Engineering',
    years_of_experience = 21,
    bio = 'Senior technical architect with 21 years of experience in enterprise systems, database design, and API development. Focuses on scalable backend solutions.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Shilpa&background=D84315&color=fff&size=128'
WHERE email = 'viewer@skope.ai';

-- Malleha - Data Scientist
UPDATE users 
SET 
    full_name = 'Malleha',
    job_title = 'Data Scientist',
    department = 'Data Science & AI',
    years_of_experience = 20,
    bio = 'Data science expert with 20 years in ML, NLP, and AI-powered analytics. Specializes in building intelligent document processing and compliance detection models.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Malleha&background=FF6F00&color=fff&size=128'
WHERE email = 'john.doe@skope.ai';

-- Assign ALL users to Admin role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'admin'
  AND u.email IN (
    'admin@skope.ai',
    'manager@skope.ai',
    'analyst@skope.ai',
    'viewer@skope.ai',
    'john.doe@skope.ai'
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Create index for profile searches
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

COMMENT ON COLUMN users.job_title IS 'User job title/position';
COMMENT ON COLUMN users.department IS 'User department/team';
COMMENT ON COLUMN users.years_of_experience IS 'Years of professional experience';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.phone IS 'Contact phone number';
COMMENT ON COLUMN users.location IS 'User location/office';
