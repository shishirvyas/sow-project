import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MainLayout from '../layouts/MainLayout'

export default function Dashboard() {
  const navigate = useNavigate()
  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to SKOPE
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-Powered Statement of Work (SOW) Analysis Platform
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Overview Card */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom color="primary">
              About This Platform
            </Typography>
            <Typography variant="body1" paragraph>
              SKOPE is an intelligent document analysis platform designed to streamline the review and assessment of 
              Statement of Work (SOW) documents. Using advanced AI technology, we help organizations quickly identify 
              risks, compliance issues, and key clauses within their contractual documents.
            </Typography>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🚀 Key Features
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Intelligent Document Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload SOW documents (PDF, DOCX, TXT) and get comprehensive AI-powered analysis with risk assessment, 
                  compliance checks, and actionable recommendations.
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Multi-Prompt Processing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents are analyzed against multiple specialized prompts to extract insights on various aspects like 
                  administrative requirements, deliverables, payment terms, and compliance obligations.
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Comprehensive History & Audit Trail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All analysis results are automatically stored in Azure Blob Storage, providing a complete history of 
                  document analyses with timestamps, success/error tracking, and detailed logs.
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Detailed Results with Error Handling
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View findings with risk levels (High, Medium, Low), compliance status, explanations, and recommended 
                  actions. Robust error handling ensures partial results are saved even if some prompts fail.
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Real-Time API Logging
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Built-in comprehensive logging of all API calls with request/response details, timestamps, and durations 
                  for debugging and monitoring.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📋 How It Works
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ 
                  minWidth: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  1
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Select & Upload</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Navigate to "Analyze Doc" and upload your SOW document through our intuitive workflow interface.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ 
                  minWidth: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  2
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>AI Processing</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Our AI engine analyzes your document against multiple specialized prompts, extracting key information 
                    and identifying potential risks and compliance issues.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ 
                  minWidth: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  3
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Review Results</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Access detailed analysis results with risk assessments, findings, and recommended actions. 
                    All results are saved to your analysis history for future reference.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              ⚙️ Technology Stack
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Frontend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • React with Vite<br/>
                  • Material-UI (MUI) Components<br/>
                  • React Router for Navigation<br/>
                  • Responsive Mobile Design
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Backend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • FastAPI (Python)<br/>
                  • Azure Blob Storage<br/>
                  • OpenAI/Groq LLM Integration<br/>
                  • Environment-based Configuration
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Features
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Structured Error Handling<br/>
                  • Comprehensive API Logging<br/>
                  • CORS Support<br/>
                  • Profile Management
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Get Started */}
        <Card elevation={2} sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Ready to Get Started?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Upload your first SOW document and experience the power of AI-driven analysis
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' }
              }}
              onClick={() => navigate('/analyze-doc')}
            >
              Analyze Document Now
            </Button>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  )
}
