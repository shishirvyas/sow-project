"""
Test script to check what prompt_service.get_all_prompts() returns
"""
import sys
from pathlib import Path
import os

# Add the project root to Python path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Verify DATABASE_URL is loaded
db_url = os.getenv('DATABASE_URL')
print(f"DATABASE_URL loaded: {bool(db_url)}")
if db_url:
    # Mask password for security
    safe_url = db_url.split('@')[1] if '@' in db_url else 'configured'
    print(f"Database host: ...@{safe_url}")

from src.app.services.prompt_service import get_all_prompts
import json

print("=" * 60)
print("Testing get_all_prompts()")
print("=" * 60)

try:
    prompts = get_all_prompts()
    
    print(f"\n✅ Successfully fetched prompts")
    print(f"📊 Type: {type(prompts)}")
    print(f"📈 Count: {len(prompts)}")
    
    if prompts:
        print(f"\n🔍 First item:")
        print(f"   Type: {type(prompts[0])}")
        print(f"   Type name: {type(prompts[0]).__name__}")
        print(f"   Value: {prompts[0]}")
        print(f"   Repr: {repr(prompts[0])}")
        
        # Check if it's dict-like
        print(f"   Has .get(): {hasattr(prompts[0], 'get')}")
        print(f"   Has .items(): {hasattr(prompts[0], 'items')}")
        
        # Try to access as dict
        try:
            print(f"\n📋 First prompt details (dict access):")
            for key, value in prompts[0].items():
                val_str = str(value)[:50] if len(str(value)) > 50 else str(value)
                print(f"   {key}: {val_str}")
        except Exception as e:
            print(f"   ❌ Cannot iterate as dict: {e}")
        
        # Try manual conversion
        print(f"\n🔄 Manual conversion test:")
        converted = {
            "id": prompts[0].get('id'),
            "clause_id": prompts[0].get('clause_id'),
            "name": prompts[0].get('name'),
            "prompt_text": prompts[0].get('prompt_text')[:50] if prompts[0].get('prompt_text') else None,
            "is_active": prompts[0].get('is_active'),
            "variable_count": prompts[0].get('variable_count')
        }
        print(f"   Converted: {converted}")
        
        print(f"\n📋 All prompts summary:")
        for i, prompt in enumerate(prompts):
            clause_id = prompt.get('clause_id', 'N/A')
            name = prompt.get('name', 'N/A')
            print(f"   [{i}] {clause_id}: {name}")
    else:
        print("\n⚠️  No prompts returned (empty list)")
    
    print(f"\n📦 JSON serialization test (with default=str):")
    try:
        json_str = json.dumps({"prompts": prompts, "count": len(prompts)}, default=str)
        print(f"   ✅ JSON length: {len(json_str)}")
        print(f"   Preview: {json_str[:300]}...")
    except Exception as e:
        print(f"   ❌ JSON serialization failed: {e}")
    
    print(f"\n📦 JSON serialization test (manual conversion):")
    try:
        prompts_list = []
        for p in prompts:
            prompts_list.append({
                "id": p.get('id'),
                "clause_id": p.get('clause_id'),
                "name": p.get('name'),
                "prompt_text": p.get('prompt_text'),
                "is_active": p.get('is_active'),
                "created_at": str(p.get('created_at')) if p.get('created_at') else None,
                "updated_at": str(p.get('updated_at')) if p.get('updated_at') else None,
                "variable_count": p.get('variable_count', 0)
            })
        json_str = json.dumps({"prompts": prompts_list, "count": len(prompts_list)})
        print(f"   ✅ JSON length: {len(json_str)}")
        print(f"   Preview: {json_str[:300]}...")
    except Exception as e:
        print(f"   ❌ Manual conversion failed: {e}")
        import traceback
        traceback.print_exc()
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
