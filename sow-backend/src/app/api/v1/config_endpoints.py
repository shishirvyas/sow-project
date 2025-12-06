"""
Configuration Management Endpoints
Handles Countries, Categories, and Sub-Categories management
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from src.app.api.v1.auth import get_current_user
from src.app.services.auth_service import get_user_permissions
from src.app.db.client import execute_query

router = APIRouter()

# ============================================================================
# Request/Response Models
# ============================================================================

class CountryRequest(BaseModel):
    country_name: str
    iso_code_2: str
    iso_code_3: str
    numeric_code: Optional[str] = None
    region: str
    is_active: bool = True

class CategoryRequest(BaseModel):
    category_name: str
    category_code: str
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class SubCategoryRequest(BaseModel):
    category_id: int
    sub_category_name: str
    sub_category_code: Optional[str] = None
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

# ============================================================================
# Country Endpoints
# ============================================================================

@router.get("/countries")
async def get_countries(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all countries (requires country.view permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'country.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            SELECT id, country_name, iso_code_2, iso_code_3, numeric_code, region, 
                   is_active, created_at, updated_at, created_by, modified_by
            FROM countries
            ORDER BY country_name
        """
        countries = execute_query(query)
        return {"countries": countries}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching countries: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/countries")
async def create_country(
    country_data: CountryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new country (requires country.create permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'country.create' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            INSERT INTO countries (country_name, iso_code_2, iso_code_3, numeric_code, region, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, country_name, iso_code_2, iso_code_3, numeric_code, region, is_active
        """
        result = execute_query(
            query,
            (country_data.country_name, country_data.iso_code_2, country_data.iso_code_3,
             country_data.numeric_code, country_data.region, country_data.is_active, current_user),
            fetch_one=True
        )
        return {"message": "Country created successfully", "country": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating country: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/countries/{country_id}")
async def update_country(
    country_id: int,
    country_data: CountryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a country (requires country.edit permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'country.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            UPDATE countries
            SET country_name = %s, iso_code_2 = %s, iso_code_3 = %s, numeric_code = %s,
                region = %s, is_active = %s, modified_by = %s
            WHERE id = %s
            RETURNING id, country_name, iso_code_2, iso_code_3, numeric_code, region, is_active
        """
        result = execute_query(
            query,
            (country_data.country_name, country_data.iso_code_2, country_data.iso_code_3,
             country_data.numeric_code, country_data.region, country_data.is_active, 
             current_user, country_id),
            fetch_one=True
        )
        if not result:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"message": "Country updated successfully", "country": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating country: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/countries/{country_id}")
async def delete_country(
    country_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a country (requires country.delete permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'country.delete' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = "DELETE FROM countries WHERE id = %s RETURNING id"
        result = execute_query(query, (country_id,), fetch_one=True)
        if not result:
            raise HTTPException(status_code=404, detail="Country not found")
        return {"message": "Country deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting country: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Category Endpoints
# ============================================================================

@router.get("/categories")
async def get_categories(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all categories with sub-category counts (requires category.view permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'category.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            SELECT c.id, c.category_name, c.category_code, c.description, c.display_order,
                   c.is_active, c.created_at, c.updated_at, c.created_by, c.modified_by,
                   COUNT(sc.id) as sub_category_count
            FROM categories c
            LEFT JOIN sub_categories sc ON c.id = sc.category_id
            GROUP BY c.id, c.category_name, c.category_code, c.description, c.display_order,
                     c.is_active, c.created_at, c.updated_at, c.created_by, c.modified_by
            ORDER BY c.display_order, c.category_name
        """
        categories = execute_query(query)
        return {"categories": categories}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories")
async def create_category(
    category_data: CategoryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new category (requires category.create permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'category.create' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            INSERT INTO categories (category_name, category_code, description, display_order, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, category_name, category_code, description, display_order, is_active
        """
        result = execute_query(
            query,
            (category_data.category_name, category_data.category_code, category_data.description,
             category_data.display_order, category_data.is_active, current_user),
            fetch_one=True
        )
        return {"message": "Category created successfully", "category": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    category_data: CategoryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a category (requires category.edit permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'category.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            UPDATE categories
            SET category_name = %s, category_code = %s, description = %s,
                display_order = %s, is_active = %s, modified_by = %s
            WHERE id = %s
            RETURNING id, category_name, category_code, description, display_order, is_active
        """
        result = execute_query(
            query,
            (category_data.category_name, category_data.category_code, category_data.description,
             category_data.display_order, category_data.is_active, current_user, category_id),
            fetch_one=True
        )
        if not result:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category updated successfully", "category": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a category (CASCADE deletes sub-categories) (requires category.delete permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'category.delete' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = "DELETE FROM categories WHERE id = %s RETURNING id"
        result = execute_query(query, (category_id,), fetch_one=True)
        if not result:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Sub-Category Endpoints
# ============================================================================

@router.get("/sub-categories")
async def get_sub_categories(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all sub-categories with parent category info (requires subcategory.view permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'subcategory.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            SELECT sc.id, sc.category_id, sc.sub_category_name, sc.sub_category_code,
                   sc.description, sc.display_order, sc.is_active, sc.created_at,
                   sc.updated_at, sc.created_by, sc.modified_by,
                   c.category_name, c.category_code
            FROM sub_categories sc
            JOIN categories c ON sc.category_id = c.id
            ORDER BY c.display_order, sc.display_order, sc.sub_category_name
        """
        sub_categories = execute_query(query)
        return {"sub_categories": sub_categories}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching sub-categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sub-categories")
async def create_sub_category(
    sub_category_data: SubCategoryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new sub-category (requires subcategory.create permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'subcategory.create' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            INSERT INTO sub_categories (category_id, sub_category_name, sub_category_code, description, display_order, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, category_id, sub_category_name, sub_category_code, description, display_order, is_active
        """
        result = execute_query(
            query,
            (sub_category_data.category_id, sub_category_data.sub_category_name, 
             sub_category_data.sub_category_code, sub_category_data.description,
             sub_category_data.display_order, sub_category_data.is_active, current_user),
            fetch_one=True
        )
        return {"message": "Sub-category created successfully", "sub_category": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating sub-category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sub-categories/{sub_category_id}")
async def update_sub_category(
    sub_category_id: int,
    sub_category_data: SubCategoryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a sub-category (requires subcategory.edit permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'subcategory.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = """
            UPDATE sub_categories
            SET category_id = %s, sub_category_name = %s, sub_category_code = %s,
                description = %s, display_order = %s, is_active = %s, modified_by = %s
            WHERE id = %s
            RETURNING id, category_id, sub_category_name, sub_category_code, description, display_order, is_active
        """
        result = execute_query(
            query,
            (sub_category_data.category_id, sub_category_data.sub_category_name,
             sub_category_data.sub_category_code, sub_category_data.description,
             sub_category_data.display_order, sub_category_data.is_active,
             current_user, sub_category_id),
            fetch_one=True
        )
        if not result:
            raise HTTPException(status_code=404, detail="Sub-category not found")
        return {"message": "Sub-category updated successfully", "sub_category": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating sub-category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sub-categories/{sub_category_id}")
async def delete_sub_category(
    sub_category_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sub-category (requires subcategory.delete permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'subcategory.delete' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = "DELETE FROM sub_categories WHERE id = %s RETURNING id"
        result = execute_query(query, (sub_category_id,), fetch_one=True)
        if not result:
            raise HTTPException(status_code=404, detail="Sub-category not found")
        return {"message": "Sub-category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting sub-category: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
