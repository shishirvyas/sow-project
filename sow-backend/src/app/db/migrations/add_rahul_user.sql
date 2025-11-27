-- Migration: Add Rahul user with AI Manager profile
-- Date: 2025-11-28

-- Insert Rahul user with complete profile
INSERT INTO users (
    email, 
    password_hash, 
    full_name, 
    job_title, 
    department, 
    years_of_experience, 
    bio, 
    phone, 
    location, 
    avatar_url, 
    is_active
) VALUES (
    'rahul@skope360.ai',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN.dhe2gvKGOinZG8lFsC', -- password123
    'Rahul Kumar',
    'AI Manager',
    'Artificial Intelligence',
    25,
    'Seasoned AI Manager with 25 years of experience in artificial intelligence, machine learning, and data science. Expert in leading AI initiatives, developing intelligent systems, and driving innovation through advanced analytics and automation.',
    '+91 98765 43210',
    'Bangalore, India',
    'https://ui-avatars.com/api/?name=Rahul+Kumar&background=2065D1&color=fff&size=200',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department,
    years_of_experience = EXCLUDED.years_of_experience,
    bio = EXCLUDED.bio,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location,
    avatar_url = EXCLUDED.avatar_url,
    is_active = EXCLUDED.is_active;

-- Assign Administrator role to Rahul
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'rahul@skope360.ai'
  AND r.name = 'Administrator'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verification query
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.job_title,
    u.department,
    u.years_of_experience,
    r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'rahul@skope360.ai';
