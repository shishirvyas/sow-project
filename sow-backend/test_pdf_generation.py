"""
Test script to verify PDF generation and Azure Blob upload
"""
import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.app.services.pdf_generator import PDFGenerator
from src.app.services.azure_blob_service import AzureBlobService

def test_pdf_generation():
    """Test PDF generation with sample data"""
    
    # Sample analysis data
    sample_data = {
        "original_filename": "test_document.pdf",
        "blob_name": "test_upload/test_document.pdf",
        "status": "success",
        "prompts_processed": 3,
        "processing_started_at": "2025-11-26T19:39:26.123456",
        "processing_completed_at": "2025-11-26T19:39:35.654321",
        "errors": [],
        "results": [
            {
                "clause_id": "TEST-001",
                "prompt_name": "Test Prompt",
                "summary": "This is a test summary of the analysis.",
                "findings": [
                    {
                        "title": "Test Finding",
                        "description": "This is a test finding description.",
                        "risk_level": "low",
                        "recommendation": "Test recommendation"
                    }
                ],
                "next_steps": ["Review the document", "Take action"]
            }
        ]
    }
    
    print("=" * 60)
    print("Testing PDF Generation and Azure Upload")
    print("=" * 60)
    
    # Step 1: Generate PDF
    print("\n📄 Step 1: Generating PDF...")
    try:
        pdf_generator = PDFGenerator()
        pdf_buffer = pdf_generator.generate_analysis_pdf(sample_data)
        print(f"✅ PDF generated successfully! Size: {len(pdf_buffer.getvalue())} bytes")
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 2: Upload to Azure
    print("\n☁️  Step 2: Uploading to Azure Blob Storage...")
    try:
        blob_service = AzureBlobService()
        
        # Test blob name
        test_result_blob = "test_analysis_20251126.json"
        
        pdf_info = blob_service.store_analysis_pdf(test_result_blob, pdf_buffer)
        
        print(f"✅ PDF uploaded successfully!")
        print(f"   Container: {pdf_info['container']}")
        print(f"   Blob Name: {pdf_info['pdf_blob_name']}")
        print(f"   Size: {pdf_info['size']} bytes")
        print(f"   URL: {pdf_info['url']}")
        
    except Exception as e:
        print(f"❌ Error uploading PDF: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 3: Verify it exists
    print("\n🔍 Step 3: Verifying PDF exists in Azure...")
    try:
        pdf_url = blob_service.get_analysis_pdf_url(test_result_blob)
        if pdf_url:
            print(f"✅ PDF verified! URL: {pdf_url}")
        else:
            print("❌ PDF not found after upload!")
    except Exception as e:
        print(f"❌ Error verifying PDF: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print(f"\n📦 Check Azure Storage Account:")
    print(f"   Container: sow-analysis-pdfs")
    print(f"   Blob: {pdf_info['pdf_blob_name']}")

if __name__ == "__main__":
    test_pdf_generation()
