-- Sample prompt templates for testing
INSERT INTO prompts (name, description, prompt_text, category, is_active, created_by) VALUES
(
    'SOW Document Analysis',
    'Comprehensive analysis of Statement of Work documents for compliance and risk assessment',
    'You are an expert procurement analyst. Analyze the provided Statement of Work (SOW) document and identify:

1. Key deliverables and milestones
2. Pricing structure and payment terms
3. Service level agreements (SLAs)
4. Compliance with company standards
5. Potential risks and red flags

Provide a structured analysis with:
- Executive summary
- Detailed findings by section
- Risk assessment (High/Medium/Low)
- Recommendations for improvement

Return your analysis in valid JSON format.',
    'Analysis',
    true,
    1
),
(
    'Contract Clause Extraction',
    'Extract and categorize specific contract clauses from documents',
    'Extract all contract clauses from the provided document. For each clause, identify:

1. Clause type (e.g., warranty, liability, termination, payment)
2. Exact text from document
3. Page or section reference
4. Key terms and conditions
5. Compliance status

Format: Return as structured JSON with array of clauses.',
    'Extraction',
    true,
    1
),
(
    'Risk Assessment - Pricing Terms',
    'Evaluate pricing terms for potential risks and non-compliance',
    'Analyze pricing-related clauses in the SOW for:

1. Rate increase caps (should be ≤ 3% annually)
2. CPI/COLA escalation terms
3. Hidden costs or fees
4. Payment schedule compliance
5. Currency and tax implications

Flag any terms that:
- Exceed standard rate increase caps
- Lack clear pricing structure
- Include vague or unlimited charges
- Miss required approval workflows

Return: JSON with risk_level, findings array, and recommendations.',
    'Validation',
    true,
    1
),
(
    'Deliverables Summary',
    'Summarize all project deliverables and acceptance criteria',
    'Create a comprehensive summary of all deliverables mentioned in the SOW:

For each deliverable:
1. Name and description
2. Due date or milestone
3. Acceptance criteria
4. Dependencies
5. Responsible party

Output: JSON array of deliverables with structured fields.',
    'Summarization',
    false,
    1
),
(
    'SLA Compliance Check',
    'Validate service level agreements against company standards',
    'Review all SLA clauses in the document and verify:

1. Response times (P1: ≤ 2 hours, P2: ≤ 4 hours, P3: ≤ 1 day)
2. Resolution times are defined
3. Severity definitions are clear
4. Penalties for non-compliance exist
5. Monitoring and reporting requirements

Compliance levels: Compliant, Tighten, Non-compliant, Missing

Return: JSON with sla_items array and overall compliance_status.',
    'Validation',
    true,
    1
);
