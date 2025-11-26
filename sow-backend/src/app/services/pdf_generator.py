"""
PDF Generation Service for SOW Analysis Results
"""
import logging
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus import KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

class PDFGenerator:
    """Generate PDF reports for SOW analysis results"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.grey,
            spaceAfter=20,
            alignment=TA_CENTER
        ))
        
        # Section header
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        # Subsection header
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#424242'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        ))
        
        # Status success
        self.styles.add(ParagraphStyle(
            name='StatusSuccess',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#2e7d32'),
            fontName='Helvetica-Bold'
        ))
        
        # Status error
        self.styles.add(ParagraphStyle(
            name='StatusError',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#d32f2f'),
            fontName='Helvetica-Bold'
        ))
        
        # Status warning
        self.styles.add(ParagraphStyle(
            name='StatusWarning',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#ed6c02'),
            fontName='Helvetica-Bold'
        ))
    
    def generate_analysis_pdf(self, analysis_data: dict) -> BytesIO:
        """
        Generate PDF from analysis JSON data
        
        Args:
            analysis_data: Analysis result dictionary
            
        Returns:
            BytesIO buffer containing PDF data
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Add title
        elements.append(Paragraph("SOW Analysis Report", self.styles['CustomTitle']))
        
        # Add document name
        doc_name = analysis_data.get('original_filename', 'Unknown Document')
        elements.append(Paragraph(f"Document: {doc_name}", self.styles['CustomSubtitle']))
        
        # Add timestamp
        timestamp = analysis_data.get('processing_completed_at', 
                                     analysis_data.get('processing_started_at', 'N/A'))
        elements.append(Paragraph(f"Generated: {timestamp}", self.styles['CustomSubtitle']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Summary Section
        elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))
        
        # Status
        status = analysis_data.get('status', 'unknown')
        status_text = f"Status: {status.replace('_', ' ').title()}"
        if status == 'success':
            elements.append(Paragraph(status_text, self.styles['StatusSuccess']))
        elif status == 'partial_success':
            elements.append(Paragraph(status_text, self.styles['StatusWarning']))
        else:
            elements.append(Paragraph(status_text, self.styles['StatusError']))
        
        # Summary table
        summary_data = [
            ['Metric', 'Value'],
            ['Prompts Processed', str(analysis_data.get('prompts_processed', 0))],
            ['Total Errors', str(len(analysis_data.get('errors', [])))],
            ['Processing Time', self._calculate_duration(analysis_data)],
            ['Source Blob', analysis_data.get('blob_name', 'N/A')]
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 4*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Errors Section
        errors = analysis_data.get('errors', [])
        if errors:
            elements.append(Paragraph("Errors Encountered", self.styles['SectionHeader']))
            for idx, error in enumerate(errors, 1):
                error_title = f"{idx}. {error.get('error_code', 'ERROR')}: {error.get('clause_id', 'Unknown')}"
                elements.append(Paragraph(error_title, self.styles['SubsectionHeader']))
                
                error_details = [
                    ['Field', 'Details'],
                    ['Message', error.get('message', 'No message')],
                    ['Prompt Name', error.get('prompt_name', 'N/A')],
                    ['Timestamp', error.get('timestamp', 'N/A')]
                ]
                
                error_table = Table(error_details, colWidths=[1.5*inch, 5*inch])
                error_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ffebee')),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                elements.append(error_table)
                elements.append(Spacer(1, 0.15*inch))
            
            elements.append(Spacer(1, 0.2*inch))
        
        # Results Section
        results = analysis_data.get('results', [])
        if results:
            elements.append(Paragraph("Analysis Results", self.styles['SectionHeader']))
            
            for result in results:
                clause_id = result.get('clause_id', 'Unknown')
                prompt_name = result.get('prompt_name', 'N/A')
                
                elements.append(Paragraph(f"{clause_id}: {prompt_name}", 
                                        self.styles['SubsectionHeader']))
                
                # Findings
                findings = result.get('findings', [])
                if findings:
                    elements.append(Paragraph("<b>Findings:</b>", self.styles['Normal']))
                    
                    for finding in findings:
                        finding_text = f"• <b>{finding.get('title', 'Finding')}</b>"
                        elements.append(Paragraph(finding_text, self.styles['Normal']))
                        
                        # Description
                        if finding.get('description'):
                            elements.append(Paragraph(f"  {finding['description']}", 
                                                    self.styles['Normal']))
                        
                        # Risk Level
                        if finding.get('risk_level'):
                            risk_color = self._get_risk_color(finding['risk_level'])
                            risk_para = Paragraph(
                                f"  Risk Level: <font color='{risk_color}'>{finding['risk_level']}</font>",
                                self.styles['Normal']
                            )
                            elements.append(risk_para)
                        
                        # Recommendation
                        if finding.get('recommendation'):
                            elements.append(Paragraph(f"  <i>Recommendation: {finding['recommendation']}</i>",
                                                    self.styles['Normal']))
                        
                        elements.append(Spacer(1, 0.1*inch))
                
                # Summary
                if result.get('summary'):
                    elements.append(Paragraph("<b>Summary:</b>", self.styles['Normal']))
                    elements.append(Paragraph(result['summary'], self.styles['Normal']))
                    elements.append(Spacer(1, 0.1*inch))
                
                # Next Steps
                next_steps = result.get('next_steps', [])
                if next_steps:
                    elements.append(Paragraph("<b>Next Steps:</b>", self.styles['Normal']))
                    for step in next_steps:
                        elements.append(Paragraph(f"• {step}", self.styles['Normal']))
                    elements.append(Spacer(1, 0.1*inch))
                
                elements.append(Spacer(1, 0.2*inch))
        
        # Footer
        elements.append(Spacer(1, 0.5*inch))
        elements.append(Paragraph(
            "Generated by SKOPE - AI-Powered SOW Analysis Platform",
            self.styles['CustomSubtitle']
        ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _calculate_duration(self, analysis_data: dict) -> str:
        """Calculate processing duration"""
        try:
            start = analysis_data.get('processing_started_at')
            end = analysis_data.get('processing_completed_at')
            
            if start and end:
                start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
                duration = (end_dt - start_dt).total_seconds()
                return f"{duration:.2f} seconds"
        except Exception as e:
            logger.error(f"Error calculating duration: {e}")
        
        return "N/A"
    
    def _get_risk_color(self, risk_level: str) -> str:
        """Get color for risk level"""
        risk_colors = {
            'high': '#d32f2f',
            'medium': '#ed6c02',
            'low': '#2e7d32'
        }
        return risk_colors.get(risk_level.lower(), '#000000')
