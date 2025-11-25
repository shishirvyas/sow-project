import React from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Grid from '@mui/material/Grid'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

const steps = ['Select File', 'Upload Document', 'Start Analysis']

export default function AnalyzeDoc() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = React.useState(0)
  const [selectedFile, setSelectedFile] = React.useState(null)
  const [blobName, setBlobName] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [recentAnalyses, setRecentAnalyses] = React.useState([])
  const [loadingRecent, setLoadingRecent] = React.useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setActiveStep(1)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await fetch('/api/v1/upload-sow', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Upload failed: Backend server not available. Please ensure the backend is running.')
        }
        throw new Error(`Upload failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      setBlobName(data.blob_name)
      setActiveStep(2)
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Upload failed: Backend server not available. Please ensure the backend is running on port 8000.')
      } else {
        setError(err.message || 'Failed to upload document')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!blobName) return
    
    setAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/process-sow/${encodeURIComponent(blobName)}`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Analysis failed: Backend server not available. Please ensure the backend is running.')
        }
        throw new Error(`Analysis failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      setResult(data)
      setActiveStep(3)
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Analysis failed: Backend server not available. Please ensure the backend is running on port 8000.')
      } else {
        setError(err.message || 'Failed to analyze document')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setActiveStep(0)
    setSelectedFile(null)
    setBlobName(null)
    setResult(null)
    setError(null)
    fetchRecentAnalyses() // Refresh recent analyses after completing workflow
  }

  const fetchRecentAnalyses = async () => {
    setLoadingRecent(true)
    try {
      const response = await fetch('/api/v1/analysis-history')
      if (response.ok) {
        const data = await response.json()
        // Get only the 5 most recent analyses
        setRecentAnalyses(data.history.slice(0, 5))
      }
    } catch (err) {
      console.error('Failed to fetch recent analyses:', err)
    } finally {
      setLoadingRecent(false)
    }
  }

  const handleViewAnalysis = (resultBlobName) => {
    navigate(`/analysis-history/${encodeURIComponent(resultBlobName)}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success'
      case 'partial_success':
        return 'warning'
      case 'failed':
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatDocName = (blobName) => {
    // Extract filename from blob path
    const parts = blobName.split('/')
    return parts[parts.length - 1] || blobName
  }

  // Fetch recent analyses on component mount
  React.useEffect(() => {
    fetchRecentAnalyses()
  }, [])

  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analyze Document
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow the workflow below to analyze your document.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Workflow Steps as Circular Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, py: 4 }}>
                {/* Step 1: Select File */}
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: activeStep >= 0 ? 'primary.main' : 'action.disabledBackground',
                      color: 'white',
                      mb: 2,
                      position: 'relative',
                      cursor: activeStep === 0 ? 'pointer' : 'default',
                      transition: 'all 200ms ease',
                      border: '4px solid',
                      borderColor: activeStep === 0 ? 'primary.light' : 'transparent',
                      '&:hover': activeStep === 0 ? {
                        transform: 'scale(1.05)',
                        boxShadow: 4,
                      } : {},
                    }}
                  >
                    <IconButton
                      component="label"
                      sx={{ color: 'inherit', width: '100%', height: '100%' }}
                    >
                      {activeStep > 0 ? (
                        <CheckCircleIcon sx={{ fontSize: 48 }} />
                      ) : (
                        <FolderOpenIcon sx={{ fontSize: 48 }} />
                      )}
                      {activeStep === 0 && (
                        <input
                          type="file"
                          hidden
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileChange}
                        />
                      )}
                    </IconButton>
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Select File
                  </Typography>
                  {selectedFile && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {selectedFile.name}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ fontSize: 32, color: 'text.secondary' }}>→</Box>

                {/* Step 2: Upload */}
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: activeStep >= 2 ? 'primary.main' : activeStep === 1 ? 'primary.main' : 'action.disabledBackground',
                      color: 'white',
                      mb: 2,
                      cursor: activeStep === 1 ? 'pointer' : 'default',
                      transition: 'all 200ms ease',
                      border: '4px solid',
                      borderColor: activeStep === 1 ? 'primary.light' : 'transparent',
                      '&:hover': activeStep === 1 ? {
                        transform: 'scale(1.05)',
                        boxShadow: 4,
                      } : {},
                    }}
                    onClick={activeStep === 1 ? handleUpload : undefined}
                  >
                    {uploading ? (
                      <CircularProgress size={48} sx={{ color: 'white' }} />
                    ) : activeStep > 1 ? (
                      <CheckCircleIcon sx={{ fontSize: 48 }} />
                    ) : (
                      <CloudUploadIcon sx={{ fontSize: 48 }} />
                    )}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Upload
                  </Typography>
                  {blobName && (
                    <Typography variant="caption" color="success.main" display="block">
                      Uploaded successfully
                    </Typography>
                  )}
                </Box>

                <Box sx={{ fontSize: 32, color: 'text.secondary' }}>→</Box>

                {/* Step 3: Analyze */}
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: activeStep >= 3 ? 'success.main' : activeStep === 2 ? 'primary.main' : 'action.disabledBackground',
                      color: 'white',
                      mb: 2,
                      cursor: activeStep === 2 ? 'pointer' : 'default',
                      transition: 'all 200ms ease',
                      border: '4px solid',
                      borderColor: activeStep === 2 ? 'primary.light' : 'transparent',
                      '&:hover': activeStep === 2 ? {
                        transform: 'scale(1.05)',
                        boxShadow: 4,
                      } : {},
                    }}
                    onClick={activeStep === 2 ? handleAnalyze : undefined}
                  >
                    {analyzing ? (
                      <CircularProgress size={48} sx={{ color: 'white' }} />
                    ) : activeStep > 2 ? (
                      <CheckCircleIcon sx={{ fontSize: 48 }} />
                    ) : (
                      <PlayArrowIcon sx={{ fontSize: 48 }} />
                    )}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Start Analysis
                  </Typography>
                  {result && (
                    <Typography variant="caption" color="success.main" display="block">
                      Analysis complete
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Results Section */}
              {result && (
                <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Analysis Results
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </Box>
                  <Button variant="outlined" onClick={handleReset} sx={{ mt: 2 }}>
                    Analyze Another Document
                  </Button>
                </Box>
              )}

              {/* Instructions */}
              {activeStep < 3 && !result && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.darker">
                    <strong>Current Step:</strong> {steps[activeStep]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {activeStep === 0 && 'Click the circular button above to select a document (PDF, DOCX, or TXT).'}
                    {activeStep === 1 && 'Click the Upload button to upload your selected document to the server.'}
                    {activeStep === 2 && 'Click the Start Analysis button to begin processing your document.'}
                  </Typography>
                </Box>
              )}

              {/* Reset Workflow Button */}
              {(activeStep > 0 || selectedFile || result) && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleReset}
                    disabled={uploading || analyzing}
                  >
                    Reset Workflow
                  </Button>
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
              {loadingRecent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : recentAnalyses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No recent analyses yet. Upload your first document to get started.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {recentAnalyses.map((analysis) => (
                    <ListItem key={analysis.result_blob_name} disablePadding>
                      <ListItemButton
                        onClick={() => handleViewAnalysis(analysis.result_blob_name)}
                        sx={{
                          borderRadius: 1,
                          mb: 0.5,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {formatDocName(analysis.source_blob)}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Chip
                                label={analysis.status}
                                color={getStatusColor(analysis.status)}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              {analysis.error_count > 0 && (
                                <Typography variant="caption" color="error.main">
                                  {analysis.error_count} error{analysis.error_count > 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  )
}
