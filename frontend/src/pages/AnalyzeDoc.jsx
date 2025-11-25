import React from 'react'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import Grid from '@mui/material/Grid'

export default function AnalyzeDoc() {
  const [selectedFile, setSelectedFile] = React.useState(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleAnalyze = () => {
    if (!selectedFile) return
    // TODO: Implement document analysis logic
    console.log('Analyzing:', selectedFile.name)
  }

  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analyze Document
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload a document (PDF, DOCX, TXT) to analyze its content and extract insights.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Document
              </Typography>
              
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(45,128,254,0.05)' : 'rgba(32,101,209,0.05)',
                  },
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Drag and drop your document here, or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Supported formats: PDF, DOCX, TXT (Max 10MB)
                </Typography>
                
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>

              {selectedFile && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Selected file:</strong> {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Size: {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleAnalyze}
                    >
                      Analyze Document
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedFile(null)}
                    >
                      Clear
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Features
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Our document analysis includes:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Content extraction and summarization
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Key phrase identification
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Entity recognition
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Sentiment analysis
                </Typography>
                <Typography component="li" variant="body2">
                  Custom clause detection
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={1} sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Analyses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent analyses yet. Upload your first document to get started.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  )
}
