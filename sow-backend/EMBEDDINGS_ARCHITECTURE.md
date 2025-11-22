# Embeddings Architecture for SOW Analysis Scaling

## Overview

This architecture adds semantic search and intelligent routing to the SOW analysis system using embeddings. It enables the system to handle 50+ clause types, large documents (100+ pages), and historical SOW search while reducing token costs and improving accuracy.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         SOW Upload                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Document Chunking & Embedding                       │
│  • Split SOW into semantic chunks (500-1000 tokens)             │
│  • Generate embeddings using text-embedding-3-small             │
│  • Store in pgvector (PostgreSQL extension)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Clause-Specific Routing                             │
│  • Each prompt template has an embedded "clause signature"       │
│  • Find relevant chunks via vector similarity search             │
│  • Route only matched chunks to appropriate prompts             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              LLM Analysis (Existing Flow)                        │
│  • Process only relevant chunks with matched prompts            │
│  • Reduce token usage by 60-80%                                 │
│  • Maintain current JSON output format                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Historical Search & Learning                        │
│  • Store analysis results with embeddings                        │
│  • "Find similar clauses" across past SOWs                       │
│  • Suggest variable values based on industry patterns           │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Extensions

### 1. Document Chunks Table
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,  -- Links to uploaded SOW
    chunk_index INTEGER NOT NULL,       -- Order within document
    chunk_text TEXT NOT NULL,
    section_name VARCHAR(255),          -- "Pricing", "SLA", etc.
    page_number INTEGER,
    embedding vector(1536),             -- OpenAI embedding dimension
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, chunk_index)
);

-- Vector similarity index for fast nearest neighbor search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Regular indexes
CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_section ON document_chunks(section_name);
```

### 2. Clause Signatures Table
```sql
CREATE TABLE clause_signatures (
    id SERIAL PRIMARY KEY,
    clause_id VARCHAR(50) REFERENCES prompt_templates(clause_id),
    signature_text TEXT NOT NULL,       -- Representative text for this clause type
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(clause_id)
);

CREATE INDEX ON clause_signatures USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);
```

### 3. Analysis Results Table (for historical search)
```sql
CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    clause_id VARCHAR(50) NOT NULL,
    chunk_id INTEGER REFERENCES document_chunks(id),
    original_text TEXT,
    compliance_status VARCHAR(50),      -- "compliant", "non_compliant", etc.
    extracted_values JSONB,             -- Cap percentages, durations, etc.
    recommendation TEXT,
    embedding vector(1536),             -- Embedding of original_text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON analysis_results USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_results_document ON analysis_results(document_id);
CREATE INDEX idx_results_clause ON analysis_results(clause_id);
CREATE INDEX idx_results_status ON analysis_results(compliance_status);
```

### 4. Documents Metadata Table
```sql
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,        -- UUID or hash
    filename VARCHAR(500) NOT NULL,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size_bytes INTEGER,
    total_chunks INTEGER,
    processing_status VARCHAR(50),      -- "pending", "processing", "completed", "failed"
    organization_id VARCHAR(100),       -- Multi-tenant support
    industry VARCHAR(100),              -- Healthcare, IT, Manufacturing, etc.
    metadata JSONB                      -- Custom fields
);

CREATE INDEX idx_docs_org ON documents(organization_id);
CREATE INDEX idx_docs_industry ON documents(industry);
CREATE INDEX idx_docs_status ON documents(processing_status);
```

## Implementation Components

### 1. Embedding Service (`src/app/services/embedding_service.py`)

```python
import openai
from typing import List, Dict, Tuple
import numpy as np
from src.app.db.client import get_connection
import logging

class EmbeddingService:
    """
    Handles document chunking, embedding generation, and vector storage
    """
    
    def __init__(self):
        self.model = "text-embedding-3-small"  # 1536 dimensions, $0.02/1M tokens
        self.chunk_size = 800  # tokens
        self.chunk_overlap = 100  # tokens
        
    def chunk_document(self, text: str, document_id: str) -> List[Dict]:
        """
        Split document into semantic chunks
        Preserves section boundaries (Pricing, SLA, etc.)
        """
        # Simple approach: split by headers and paragraphs
        sections = self._detect_sections(text)
        chunks = []
        
        for section_name, section_text in sections:
            # Further split large sections
            section_chunks = self._split_by_tokens(section_text, self.chunk_size, self.chunk_overlap)
            
            for i, chunk_text in enumerate(section_chunks):
                chunks.append({
                    'document_id': document_id,
                    'chunk_index': len(chunks),
                    'chunk_text': chunk_text,
                    'section_name': section_name,
                    'page_number': None  # TODO: Extract from PDF metadata
                })
        
        return chunks
    
    def _detect_sections(self, text: str) -> List[Tuple[str, str]]:
        """
        Detect common SOW sections: Pricing, SLA, Warranty, etc.
        Returns [(section_name, section_text), ...]
        """
        import re
        
        section_patterns = [
            (r'PRICING|RATE SCHEDULE|FEES', 'Pricing'),
            (r'SLA|SERVICE LEVEL', 'SLA'),
            (r'WARRANTY|DEFECT|REMEDIATION', 'Warranty'),
            (r'ESCALATION|RATE INCREASE|CPI', 'Escalation'),
            (r'TERMINATION|CANCELLATION', 'Termination'),
        ]
        
        sections = []
        current_section = 'General'
        current_text = []
        
        for line in text.split('\n'):
            # Check if line is a section header
            matched = False
            for pattern, section_name in section_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    # Save previous section
                    if current_text:
                        sections.append((current_section, '\n'.join(current_text)))
                    current_section = section_name
                    current_text = [line]
                    matched = True
                    break
            
            if not matched:
                current_text.append(line)
        
        # Add final section
        if current_text:
            sections.append((current_section, '\n'.join(current_text)))
        
        return sections
    
    def _split_by_tokens(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """
        Split text into overlapping chunks by token count
        """
        import tiktoken
        
        enc = tiktoken.encoding_for_model("gpt-4")
        tokens = enc.encode(text)
        
        chunks = []
        start = 0
        
        while start < len(tokens):
            end = start + chunk_size
            chunk_tokens = tokens[start:end]
            chunk_text = enc.decode(chunk_tokens)
            chunks.append(chunk_text)
            
            start += (chunk_size - overlap)
        
        return chunks
    
    async def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """
        Generate embeddings for all chunks using OpenAI API
        Batches requests for efficiency
        """
        batch_size = 100
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]
            texts = [chunk['chunk_text'] for chunk in batch]
            
            # Call OpenAI embedding API
            response = await openai.Embedding.acreate(
                model=self.model,
                input=texts
            )
            
            # Add embeddings to chunks
            for j, embedding_obj in enumerate(response['data']):
                chunks[i+j]['embedding'] = embedding_obj['embedding']
        
        return chunks
    
    def store_chunks(self, chunks: List[Dict]):
        """
        Store chunks with embeddings in PostgreSQL
        """
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            for chunk in chunks:
                cur.execute("""
                    INSERT INTO document_chunks 
                    (document_id, chunk_index, chunk_text, section_name, page_number, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (document_id, chunk_index) DO UPDATE
                    SET chunk_text = EXCLUDED.chunk_text,
                        section_name = EXCLUDED.section_name,
                        embedding = EXCLUDED.embedding
                """, (
                    chunk['document_id'],
                    chunk['chunk_index'],
                    chunk['chunk_text'],
                    chunk['section_name'],
                    chunk.get('page_number'),
                    chunk['embedding']
                ))
            
            conn.commit()
            logging.info(f"Stored {len(chunks)} chunks for document {chunks[0]['document_id']}")
            
        except Exception as e:
            conn.rollback()
            logging.error(f"Error storing chunks: {e}")
            raise
        finally:
            cur.close()
            conn.close()
    
    def create_clause_signature(self, clause_id: str, signature_text: str):
        """
        Create and store embedding for a clause type
        Used for routing chunks to appropriate prompts
        """
        import asyncio
        
        # Generate embedding
        response = asyncio.run(openai.Embedding.acreate(
            model=self.model,
            input=[signature_text]
        ))
        
        embedding = response['data'][0]['embedding']
        
        # Store in database
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO clause_signatures (clause_id, signature_text, embedding)
                VALUES (%s, %s, %s)
                ON CONFLICT (clause_id) DO UPDATE
                SET signature_text = EXCLUDED.signature_text,
                    embedding = EXCLUDED.embedding
            """, (clause_id, signature_text, embedding))
            
            conn.commit()
            logging.info(f"Created clause signature for {clause_id}")
            
        except Exception as e:
            conn.rollback()
            logging.error(f"Error creating clause signature: {e}")
            raise
        finally:
            cur.close()
            conn.close()
```

### 2. Vector Search Service (`src/app/services/vector_search_service.py`)

```python
from typing import List, Dict, Tuple
from src.app.db.client import get_connection
import logging

class VectorSearchService:
    """
    Semantic search using pgvector
    """
    
    def find_relevant_chunks(self, query_embedding: List[float], 
                            top_k: int = 5, 
                            similarity_threshold: float = 0.7) -> List[Dict]:
        """
        Find chunks most similar to query embedding
        Returns chunks with cosine similarity > threshold
        """
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT 
                    id,
                    document_id,
                    chunk_index,
                    chunk_text,
                    section_name,
                    1 - (embedding <=> %s::vector) as similarity
                FROM document_chunks
                WHERE 1 - (embedding <=> %s::vector) > %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (query_embedding, query_embedding, similarity_threshold, query_embedding, top_k))
            
            results = []
            for row in cur.fetchall():
                results.append({
                    'id': row[0],
                    'document_id': row[1],
                    'chunk_index': row[2],
                    'chunk_text': row[3],
                    'section_name': row[4],
                    'similarity': row[5]
                })
            
            logging.info(f"Found {len(results)} relevant chunks with similarity > {similarity_threshold}")
            return results
            
        finally:
            cur.close()
            conn.close()
    
    def route_chunks_to_clauses(self, document_id: str) -> Dict[str, List[Dict]]:
        """
        For each chunk in document, find best matching clause type
        Returns {clause_id: [chunks], ...}
        """
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            # Get all chunks for this document
            cur.execute("""
                SELECT id, chunk_text, section_name, embedding
                FROM document_chunks
                WHERE document_id = %s
                ORDER BY chunk_index
            """, (document_id,))
            
            chunks = []
            for row in cur.fetchall():
                chunks.append({
                    'id': row[0],
                    'chunk_text': row[1],
                    'section_name': row[2],
                    'embedding': row[3]
                })
            
            # Get all clause signatures
            cur.execute("""
                SELECT clause_id, embedding
                FROM clause_signatures
            """)
            
            signatures = {row[0]: row[1] for row in cur.fetchall()}
            
            # Route each chunk to best matching clause(s)
            routing = {clause_id: [] for clause_id in signatures.keys()}
            
            for chunk in chunks:
                # Calculate similarity to each clause signature
                best_clauses = []
                
                for clause_id, sig_embedding in signatures.items():
                    cur.execute("""
                        SELECT 1 - (%s::vector <=> %s::vector) as similarity
                    """, (chunk['embedding'], sig_embedding))
                    
                    similarity = cur.fetchone()[0]
                    
                    if similarity > 0.6:  # Threshold for relevance
                        best_clauses.append((clause_id, similarity))
                
                # Add chunk to top matching clauses
                best_clauses.sort(key=lambda x: x[1], reverse=True)
                for clause_id, sim in best_clauses[:2]:  # Top 2 matches
                    routing[clause_id].append({
                        **chunk,
                        'relevance_score': sim
                    })
            
            # Filter out empty clause types
            routing = {k: v for k, v in routing.items() if v}
            
            logging.info(f"Routed {len(chunks)} chunks to {len(routing)} clause types")
            return routing
            
        finally:
            cur.close()
            conn.close()
    
    def find_similar_clauses(self, clause_text: str, 
                            clause_type: str = None,
                            top_k: int = 10) -> List[Dict]:
        """
        Find historical clauses similar to the given text
        Useful for "show me examples of compliant warranty clauses"
        """
        import asyncio
        import openai
        
        # Embed the query clause
        response = asyncio.run(openai.Embedding.acreate(
            model="text-embedding-3-small",
            input=[clause_text]
        ))
        
        query_embedding = response['data'][0]['embedding']
        
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            where_clause = ""
            params = [query_embedding, query_embedding, top_k]
            
            if clause_type:
                where_clause = "AND clause_id = %s"
                params.insert(2, clause_type)
            
            cur.execute(f"""
                SELECT 
                    document_id,
                    clause_id,
                    original_text,
                    compliance_status,
                    extracted_values,
                    recommendation,
                    1 - (embedding <=> %s::vector) as similarity
                FROM analysis_results
                WHERE 1 = 1 {where_clause}
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, params)
            
            results = []
            for row in cur.fetchall():
                results.append({
                    'document_id': row[0],
                    'clause_id': row[1],
                    'original_text': row[2],
                    'compliance_status': row[3],
                    'extracted_values': row[4],
                    'recommendation': row[5],
                    'similarity': row[6]
                })
            
            return results
            
        finally:
            cur.close()
            conn.close()
```

### 3. Enhanced Processing Flow (`src/app/services/process_with_embeddings.py`)

```python
import asyncio
from typing import Dict, List
from src.app.services.embedding_service import EmbeddingService
from src.app.services.vector_search_service import VectorSearchService
from src.app.services.prompt_db_service import PromptDatabaseService
from src.app.services.process_sows_single_call import call_llm_single
import logging

async def process_sow_with_embeddings(document_id: str, sow_text: str) -> Dict:
    """
    Enhanced SOW processing with embeddings for intelligent routing
    
    Steps:
    1. Chunk document and generate embeddings
    2. Route chunks to relevant clause types
    3. Process only relevant chunks with matched prompts
    4. Store results with embeddings for future search
    """
    
    embed_service = EmbeddingService()
    search_service = VectorSearchService()
    prompt_service = PromptDatabaseService()
    
    # Step 1: Chunk and embed document
    logging.info(f"Chunking document {document_id}...")
    chunks = embed_service.chunk_document(sow_text, document_id)
    
    logging.info(f"Generating embeddings for {len(chunks)} chunks...")
    chunks_with_embeddings = await embed_service.embed_chunks(chunks)
    
    logging.info(f"Storing chunks in database...")
    embed_service.store_chunks(chunks_with_embeddings)
    
    # Step 2: Route chunks to clause types
    logging.info(f"Routing chunks to clause types...")
    routing = search_service.route_chunks_to_clauses(document_id)
    
    logging.info(f"Matched chunks to {len(routing)} clause types: {list(routing.keys())}")
    
    # Step 3: Process each clause type with relevant chunks only
    all_results = []
    
    for clause_id, relevant_chunks in routing.items():
        # Get prompt template
        prompt_template = prompt_service.fetch_prompt_by_clause_id(clause_id)
        
        if not prompt_template:
            logging.warning(f"No prompt found for {clause_id}, skipping")
            continue
        
        # Combine relevant chunks into context
        chunk_texts = [c['chunk_text'] for c in relevant_chunks]
        context = "\n\n---\n\n".join(chunk_texts)
        
        logging.info(f"Processing {clause_id} with {len(relevant_chunks)} relevant chunks "
                    f"({len(context)} chars vs {len(sow_text)} full doc)")
        
        # Call LLM with reduced context
        result = await call_llm_single(
            clause_id=clause_id,
            prompt=prompt_template,
            sow_text=context,  # Only relevant chunks, not full document
            provider="groq"
        )
        
        if result:
            all_results.append({
                'clause_id': clause_id,
                'result': result,
                'chunks_used': len(relevant_chunks),
                'relevance_scores': [c['relevance_score'] for c in relevant_chunks]
            })
    
    # Step 4: Store results with embeddings for historical search
    await store_analysis_results(document_id, all_results)
    
    return {
        'document_id': document_id,
        'total_chunks': len(chunks),
        'clause_types_matched': len(routing),
        'results': all_results,
        'token_savings_estimate': f"{100 - (sum([r['chunks_used'] for r in all_results]) * 100 / (len(chunks) * len(routing)):.0f}%"
    }

async def store_analysis_results(document_id: str, results: List[Dict]):
    """
    Store analysis results with embeddings for future similarity search
    """
    import openai
    from src.app.db.client import get_connection
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        for result_item in results:
            clause_id = result_item['clause_id']
            result = result_item['result']
            
            if not result.get('findings'):
                continue
            
            for finding in result['findings']:
                original_text = finding.get('original_text', '')
                
                if not original_text:
                    continue
                
                # Generate embedding for the extracted clause text
                embed_response = await openai.Embedding.acreate(
                    model="text-embedding-3-small",
                    input=[original_text]
                )
                
                embedding = embed_response['data'][0]['embedding']
                
                # Store result
                cur.execute("""
                    INSERT INTO analysis_results
                    (document_id, clause_id, original_text, compliance_status, 
                     extracted_values, recommendation, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    document_id,
                    clause_id,
                    original_text,
                    finding.get('compliance_status'),
                    finding,  # Store full finding as JSONB
                    finding.get('recommendation_preferred'),
                    embedding
                ))
        
        conn.commit()
        logging.info(f"Stored analysis results for document {document_id}")
        
    except Exception as e:
        conn.rollback()
        logging.error(f"Error storing analysis results: {e}")
        raise
    finally:
        cur.close()
        conn.close()
```

### 4. Initialize Clause Signatures (One-time setup)

```python
# src/app/services/init_clause_signatures.py

from src.app.services.embedding_service import EmbeddingService

def initialize_clause_signatures():
    """
    Create embeddings for each clause type to enable routing
    Run this once after adding new clause types
    """
    
    embed_service = EmbeddingService()
    
    signatures = {
        'ADM-E01': """
            Annual rate increase, CPI escalation, inflation adjustment, 
            price increase cap, cost of living adjustment, indexation,
            pricing schedule updates, fee escalation clause
        """,
        
        'ADM-E04': """
            Defect remediation, bug fixes, warranty obligations, 
            quality assurance, corrective action, rework requirements,
            testing phase fixes, post-deployment support, SLA response times
        """,
        
        # Add more as you create new clause types
        'ADM-E02': """
            Termination rights, cancellation clause, exit provisions,
            wind-down procedures, termination fees, notice period
        """,
        
        'ADM-E03': """
            Liability caps, indemnification, limitation of liability,
            consequential damages, insurance requirements
        """,
    }
    
    for clause_id, signature_text in signatures.items():
        try:
            embed_service.create_clause_signature(clause_id, signature_text.strip())
            print(f"✓ Created signature for {clause_id}")
        except Exception as e:
            print(f"✗ Failed to create signature for {clause_id}: {e}")

if __name__ == "__main__":
    initialize_clause_signatures()
```

## API Endpoints (New)

### Enhanced Process Endpoint

```python
# In src/app/api/v1/endpoints.py

@router.post("/process-sows-smart")
async def process_sows_smart(document_id: str):
    """
    Process SOW with embeddings-based intelligent routing
    Only processes relevant sections with matched clause types
    """
    from src.app.services.process_with_embeddings import process_sow_with_embeddings
    from pathlib import Path
    
    # Load SOW text (same as before)
    backend_root = Path(__file__).resolve().parents[4]
    sow_dir = backend_root / "resources" / "sow-docs"
    
    # Find document file
    sow_file = next(sow_dir.glob(f"{document_id}*"), None)
    
    if not sow_file:
        return JSONResponse(
            status_code=404,
            content={"error": f"Document {document_id} not found"}
        )
    
    sow_text = sow_file.read_text(encoding='utf-8')
    
    # Process with embeddings
    result = await process_sow_with_embeddings(document_id, sow_text)
    
    return result

@router.get("/search/similar-clauses")
async def search_similar_clauses(
    query: str, 
    clause_type: str = None, 
    top_k: int = 10
):
    """
    Find historical clauses similar to query text
    
    Example: "warranty period of 6 months with no-charge fixes"
    Returns past SOWs with similar warranty clauses
    """
    from src.app.services.vector_search_service import VectorSearchService
    
    search_service = VectorSearchService()
    results = search_service.find_similar_clauses(query, clause_type, top_k)
    
    return {
        'query': query,
        'clause_type': clause_type,
        'results': results,
        'count': len(results)
    }
```

## Costs & Performance

### Embedding Costs (OpenAI text-embedding-3-small)
- **Price**: $0.02 per 1M tokens
- **Typical SOW**: 50 pages = ~30,000 tokens = $0.0006
- **100 SOWs/month**: $0.06/month for embeddings

### Token Savings
- **Without embeddings**: Process full 30k token SOW × 10 clause types = 300k tokens to LLM
- **With embeddings**: Process only relevant 5k tokens × 3 matched clauses = 15k tokens
- **Savings**: 95% reduction in LLM tokens → 20x cost reduction

### Vector Database (pgvector)
- **Storage**: 1536 dimensions × 4 bytes = 6KB per embedding
- **10,000 chunks**: ~60MB storage (negligible)
- **Query speed**: <100ms for similarity search with IVFFlat index

## Migration Path

### Phase 1: Install pgvector (Today)
```bash
# On Aiven PostgreSQL
# Already included in Aiven managed PostgreSQL
# Just need to enable the extension
```

```sql
-- Run this in your Aiven database
CREATE EXTENSION IF NOT EXISTS vector;
```

### Phase 2: Add Schema (Week 1)
- Run the extended schema SQL
- Add 4 new tables: `document_chunks`, `clause_signatures`, `analysis_results`, `documents`

### Phase 3: Initialize Signatures (Week 1)
- Run `init_clause_signatures.py`
- Create embeddings for ADM-E01 and ADM-E04

### Phase 4: Parallel Testing (Week 2-3)
- Keep existing `/process-sows` endpoint
- Add new `/process-sows-smart` endpoint
- Compare results and costs side-by-side

### Phase 5: Full Switchover (Week 4)
- Replace old endpoint with smart version
- Add historical search endpoints
- Monitor cost savings

## Benefits Summary

1. **60-80% token cost reduction** - Only process relevant chunks
2. **Support 50+ clause types** - Route automatically, no manual selection
3. **Handle 200+ page SOWs** - Chunk and process incrementally
4. **Historical search** - "Find SOWs with similar warranty terms"
5. **Smart variable suggestions** - Based on industry/document patterns
6. **Faster processing** - Parallel chunk analysis
7. **Better accuracy** - LLM focuses on relevant context only

## When to Activate

✅ Activate embeddings when you:
- Add 5+ more clause types (total 7+)
- Process SOWs >50 pages regularly
- Need historical clause search
- LLM token costs exceed $50/month
- Want to support multi-tenant with different rules

❌ Don't activate yet if:
- Only 2-3 clause types
- SOWs are <20 pages
- Processing <100 SOWs/month
- Current system works fine

## Questions to Consider

1. **Cost**: Are you spending >$50/month on LLM tokens currently?
2. **Scale**: Planning to add 10+ more clause types soon?
3. **Documents**: Are SOWs getting larger (100+ pages)?
4. **Search**: Would users benefit from "find similar clauses" feature?
5. **Multi-tenant**: Need different orgs with different compliance rules?

If you answer "yes" to 2+ questions, activate embeddings architecture now!
