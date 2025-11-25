from fastapi import APIRouter

router = APIRouter()

@router.get("/profile")
def get_profile():
    """
    Get user profile information
    
    Returns:
        User profile with personal and professional details
    """
    return {
        "name": "Shishir Vyas",
        "role": "Head of Engineering",
        "title": "Head of Engineering",
        "email": "shishir.vyas@company.com",
        "department": "Engineering",
        "location": "San Francisco, CA",
        "avatar": "SV",
        "initials": "SV",
        "bio": "Leading engineering teams to build innovative solutions and drive technical excellence.",
        "experience_years": 12,
        "skills": [
            "Software Architecture",
            "Team Leadership",
            "Cloud Computing",
            "AI/ML Integration",
            "Agile Development"
        ],
        "contact": {
            "phone": "+1 (555) 123-4567",
            "extension": "1234"
        },
        "social": {
            "linkedin": "linkedin.com/in/shishirvyas",
            "github": "github.com/shishirvyas"
        },
        "preferences": {
            "theme": "light",
            "notifications": True,
            "language": "en"
        }
    }
