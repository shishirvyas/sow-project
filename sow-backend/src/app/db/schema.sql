-- Prompt templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id SERIAL PRIMARY KEY,
    clause_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prompt variables table for dynamic substitution
CREATE TABLE IF NOT EXISTS prompt_variables (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER REFERENCES prompt_templates(id) ON DELETE CASCADE,
    variable_name VARCHAR(100) NOT NULL,
    variable_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prompt_id, variable_name)
);

-- Example data for ADM-E01 (Annual Rate Increase)
INSERT INTO prompt_templates (clause_id, name, prompt_text) VALUES
('ADM-E01', 'Annual Rate Increase Audit', 
'You are a procurement clause auditor analyzing Statements of Work for annual rate increase and CPI escalation clauses. Extract clauses, assess compliance, and recommend improvements. Return valid JSON only.

TASK:
Locate language about annual rate increases, CPI, COLA, escalation, or annual adjustments. Focus on {{focus_sections}}.

TRIGGER TERMS:
{{trigger_terms}}

COMPLIANCE RULES:
- Cap > {{max_cap}}%: Non-compliant
- Cap > {{preferred_cap}}% and <= {{max_cap}}%: Tighten to {{preferred_cap}}-{{fallback_cap}}%
- Cap <= {{preferred_cap}}%: Compliant
- No cap or market-based pricing: Missing cap
- Non-annual frequency (quarterly, semi-annual): Treat as escalation, recommend annual cap

OUTPUT JSON SCHEMA:
{
  "detected": true,
  "findings": [
    {
      "clause_id": "{{clause_id}}",
      "section_hint": "Pricing",
      "trigger_terms": ["CPI", "annual adjustment"],
      "original_text": "exact clause text from SOW",
      "stated_cap_percent": 6.0,
      "frequency": "annual",
      "basis_index": "CPI-U",
      "compliance_status": "non_compliant",
      "reason": "Cap exceeds {{max_cap}}%",
      "recommendation_preferred": "Cap annual increases at the lesser of {{preferred_cap}}% or CPI-U.",
      "recommendation_fallback": "Cap annual increases at the lesser of {{fallback_cap}}% or CPI-U.",
      "suggested_redline_text": "Annual fees may increase once per 12-month period by the lesser of CPI-U (U.S. city average, all items, non-seasonally adjusted) or {{preferred_cap}}%, non-compounded, with 30 days prior written notice."
    }
  ],
  "overall_risk": "high",
  "actions": [
    "Insert cap at {{preferred_cap}}% or {{fallback_cap}}%",
    "Specify CPI-U index and geography",
    "Require non-compounded increases limited to once per 12 months"
  ]
}

EXAMPLES:
{{examples}}

Return only valid JSON. No additional text or markdown formatting.')
ON CONFLICT (clause_id) DO NOTHING;

-- Variables for ADM-E01
INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description) VALUES
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'focus_sections', 'Pricing, Rate Schedule, and Escalation Clause sections', 'Sections to prioritize'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'trigger_terms', 'rate increase, CPI, CPI-U, Consumer Price Index, escalation, annual adjustment, indexation, COLA, inflation, cost-of-living', 'Terms to search for'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'max_cap', '5', 'Maximum acceptable cap percentage'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'preferred_cap', '3.5', 'Preferred cap percentage'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'fallback_cap', '4.0', 'Fallback cap percentage'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'clause_id', 'ADM-E01', 'Clause identifier'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'examples', 
'Example 1 - Non-compliant (>5%):
Input: "Rates may be adjusted annually by CPI, not to exceed six percent (6%)."
Output: stated_cap_percent: 6.0, compliance_status: "non_compliant", reason: "Cap exceeds 5%"

Example 2 - Compliant (<=4%):
Input: "Annual adjustment equal to CPI-U, capped at three percent (3%)."
Output: stated_cap_percent: 3.0, compliance_status: "compliant", reason: "Cap at 3% meets target"

Example 3 - Tighten (>4% and <=5%):
Input: "Annual price increase shall be the lesser of CPI or five percent (5%)."
Output: stated_cap_percent: 5.0, compliance_status: "tighten", reason: "Cap at 5% should tighten to 3.5-4%"

Example 4 - Missing cap:
Input: "Prices are subject to supplier''s standard annual list update and inflation."
Output: stated_cap_percent: null, compliance_status: "missing_cap", reason: "Annual escalation with no ceiling"', 'Example scenarios');

-- Example data for ADM-E04 (Defect Remediation)
INSERT INTO prompt_templates (clause_id, name, prompt_text) VALUES
('ADM-E04', 'Defect Remediation and Warranty Audit',
'You are a procurement clause auditor analyzing Statements of Work for defect remediation and warranty obligations. Extract clauses, assess compliance, and recommend improvements. Return valid JSON only.

TASK:
Locate language about defect/bug remediation, rework, warranty, quality obligations, or corrective actions. Focus on {{focus_sections}}.

TRIGGER TERMS:
{{trigger_terms}}

TESTING PHASES:
{{testing_phases}}

BUYER TARGET POSITION:
{{buyer_target_position}}

COMPLIANCE RULES:
{{compliance_rules}}

OUTPUT JSON SCHEMA:
{
  "detected": true,
  "findings": [
    {
      "clause_id": "{{clause_id}}",
      "section_hint": "SLA",
      "trigger_terms": ["defect", "warranty"],
      "original_text": "exact clause text from SOW",
      "testing_phase_coverage": {
        "integration_system_testing": "vendor_fix_no_charge",
        "uat_testing": "vendor_fix_no_charge"
      },
      "post_deployment_warranty": {
        "duration_months": {{warranty_months}},
        "cost_to_fix": "vendor"
      },
      "scope_includes": ["code", "config", "interfaces", "data mappings"],
      "notable_exclusions": ["buyer post-launch changes", "third-party failures"],
      "compliance_status": "compliant",
      "reason": "{{warranty_months}}-month warranty with no-charge fixes and SLAs",
      "recommendation_preferred": "Vendor fixes all defects during testing and for {{warranty_months}} months post-deployment at no charge, with P1/P2/P3 SLAs.",
      "recommendation_fallback": "Extend warranty to at least {{min_warranty_months}} months with no-charge fixes and minimal exclusions.",
      "suggested_redline_text": "{{suggested_redline}}"
    }
  ],
  "overall_risk": "high",
  "actions": [
    "Insert/extend no-charge warranty to {{warranty_months}} months post-deployment",
    "Make testing-phase fixes explicitly vendor-paid",
    "Add P1/P2/P3 response and resolution SLAs",
    "Narrow exclusions to avoid negating obligations"
  ]
}

EXAMPLES:
{{examples}}

Return only valid JSON. No additional text or markdown formatting.')
ON CONFLICT (clause_id) DO NOTHING;

-- Variables for ADM-E04
INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description) VALUES
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'focus_sections', 'SLA, Warranty Terms, and Quality Clause sections', 'Sections to prioritize'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'trigger_terms', 'defect, bug, issue, error, fault, nonconformance, rework, warranty, quality, fix, remedy, correction', 'Terms to search for'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'testing_phases', 'integration testing, system testing, SIT, UAT, go-live, post-deployment, production', 'Testing phase names'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'warranty_months', '6', 'Target warranty duration in months'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'min_warranty_months', '4', 'Minimum acceptable warranty duration'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'clause_id', 'ADM-E04', 'Clause identifier'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'buyer_target_position', 
'- During integration/system testing and UAT: Vendor fixes all defects at no charge
- Post-deployment warranty: Vendor fixes all vendor-caused defects within 6 months at no charge
- SLAs: P1/P2/P3 response and resolution times defined
- Scope: Includes code, configuration, interfaces, data mappings delivered by vendor
- Exclusions: Reasonable only (buyer changes post-launch, third-party failures)
- No T&M or change orders for defect remediation within warranty period', 'Buyer target requirements'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'compliance_rules',
'- Testing-phase fixes are chargeable or not vendor-owned: Non-compliant
- Post-deployment warranty < 90 days: Non-compliant
- Post-deployment warranty 90-180 days: Tighten to 6 months
- No warranty duration or silent on cost: Missing
- No SLAs for severity levels: Tighten
- Overbroad exclusions: Non-compliant
- Vague "material defects" without criteria: Tighten', 'Compliance evaluation rules'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'suggested_redline',
'Vendor shall, at no additional cost, correct any Defect in Deliverables discovered during Integration/System and UAT testing and within six (6) months after Production Go-Live. Defect includes any failure to meet specifications in code, configuration, integrations, or data mappings. SLAs: P1 - response 2 hours, workaround 8 hours, resolution 24 hours; P2 - response 4 hours, resolution 3 business days; P3 - response 1 business day, resolution 10 business days. Exclusions: issues caused solely by Buyer''s post-go-live changes or third-party outages not controlled by Vendor.', 'Suggested contract language'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'examples',
'Example 1 - Non-compliant (chargeable fixes, 30-day warranty):
Input: "Defects identified after go-live are addressed on a time-and-materials basis. Warranty period is thirty (30) days."
Output: duration_months: 1, cost_to_fix: "buyer", compliance_status: "non_compliant", reason: "Chargeable fixes; warranty < 6 months"

Example 2 - Tighten (90-day no-charge, missing SLAs):
Input: "Vendor will correct material defects at no additional cost for ninety (90) days after acceptance."
Output: duration_months: 3, cost_to_fix: "vendor", compliance_status: "tighten", reason: "Warranty < 6 months; SLAs missing"

Example 3 - Compliant (testing fixes + 6-month warranty, SLAs present):
Input: "Vendor shall remediate defects during system/integration and UAT testing at no charge. For six (6) months after go-live, Vendor shall correct all defects at no charge. P1: 2h/24h; P2: 4h/3d; P3: 1d/10d."
Output: integration_system_testing: "vendor_fix_no_charge", duration_months: 6, compliance_status: "compliant"

Example 4 - Missing (silent on warranty):
Input: "Vendor will use commercially reasonable efforts to address reported issues."
Output: compliance_status: "missing", reason: "No warranty duration; no cost responsibility; no SLAs"', 'Example scenarios');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_templates_clause_id ON prompt_templates(clause_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_variables_prompt_id ON prompt_variables(prompt_id);
