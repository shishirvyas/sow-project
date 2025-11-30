-- Seed prompt templates and variables for testing
-- Inserts two templates (ADM-E01, ADM-E04), their variables, and sample prompts

BEGIN;

-- ADM-E01: Annual Rate Increase Audit
INSERT INTO prompt_templates (clause_id, name, prompt_text, is_active)
VALUES (
  'ADM-E01',
  'Annual Rate Increase Audit',
  'You are a procurement clause auditor analyzing Statements of Work for annual rate increase and CPI escalation clauses. Extract clauses, assess compliance, and recommend improvements. Return valid JSON only.\n\nTASK: Locate language about annual rate increases, CPI, COLA, escalation, or annual adjustments. Focus on {{focus_sections}}.\n\nTRIGGER TERMS: {{trigger_terms}}\n\nCOMPLIANCE RULES: - Cap > {{max_cap}}%: Non-compliant - Cap > {{preferred_cap}}% and <= {{max_cap}}%: Tighten to {{preferred_cap}}-{{fallback_cap}}% - Cap <= {{preferred_cap}}%: Compliant',
  TRUE
)
ON CONFLICT (clause_id) DO NOTHING;

-- Variables for ADM-E01
INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description)
VALUES
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'focus_sections', 'Pricing, Rate Schedule, and Escalation Clause sections', 'Sections to prioritize'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'trigger_terms', 'rate increase, CPI, CPI-U, Consumer Price Index, escalation, annual adjustment, indexation, COLA, inflation, cost-of-living', 'Terms to search for'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'max_cap', '5', 'Maximum acceptable cap percentage'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'preferred_cap', '3.5', 'Preferred cap percentage'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E01'), 'fallback_cap', '4.0', 'Fallback cap percentage')
ON CONFLICT (prompt_id, variable_name) DO NOTHING;

-- ADM-E04: Defect Remediation and Warranty Audit
INSERT INTO prompt_templates (clause_id, name, prompt_text, is_active)
VALUES (
  'ADM-E04',
  'Defect Remediation and Warranty Audit',
  'You are a procurement clause auditor analyzing Statements of Work for defect remediation and warranty obligations. Extract clauses, assess compliance, and recommend improvements. Return valid JSON only.\n\nTASK: Locate language about defect/bug remediation, rework, warranty, quality obligations, or corrective actions. Focus on {{focus_sections}}.\n\nTRIGGER TERMS: {{trigger_terms}}',
  TRUE
)
ON CONFLICT (clause_id) DO NOTHING;

-- Variables for ADM-E04
INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description)
VALUES
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'focus_sections', 'SLA, Warranty Terms, and Quality Clause sections', 'Sections to prioritize'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'trigger_terms', 'defect, bug, issue, error, fault, nonconformance, rework, warranty, quality, fix, remedy, correction', 'Terms to search for'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'warranty_months', '6', 'Target warranty duration in months'),
((SELECT id FROM prompt_templates WHERE clause_id = 'ADM-E04'), 'min_warranty_months', '4', 'Minimum acceptable warranty duration')
ON CONFLICT (prompt_id, variable_name) DO NOTHING;

-- Sample ad-hoc prompts (admin-created)
INSERT INTO prompts (name, description, prompt_text, category, is_active, created_by)
VALUES
('Quick SOW Audit', 'Quick audit for rate increase sections', 'Analyze the provided SOW text for rate increase and escalation clauses. Return summarized JSON.', 'Audit', TRUE, NULL),
('Warranty Checklist', 'Checklist for warranty obligations', 'Scan document for warranty and defect remediation obligations; produce checklist JSON.', 'Audit', TRUE, NULL)
;

COMMIT;

-- End of seed script
