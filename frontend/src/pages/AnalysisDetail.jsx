import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import Grid from '@mui/material/Grid'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

export default function AnalysisDetail() {
  const { resultBlobName } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [data, setData] = React.useState(null)
  const [downloadingPDF, setDownloadingPDF] = React.useState(false)
  const [pdfAvailable, setPdfAvailable] = React.useState(false)

  React.useEffect(() => {
    fetchDetail()
    checkPDFAvailability()
  }, [resultBlobName])

  const checkPDFAvailability = async () => {
    try {
      const response = await apiFetch(`api/v1/analysis-history/${encodeURIComponent(resultBlobName)}/pdf-url`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('PDF endpoint not found for this analysis')
          setPdfAvailable(false)
          return
        }
      }
      
      const data = await response.json()
      setPdfAvailable(data.status === 'available')
    } catch (err) {
      console.error('Error checking PDF availability:', err)
      setPdfAvailable(false)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    setError(null)
    
    try {
      // First check if PDF exists
      const statusResponse = await apiFetch(`api/v1/analysis-history/${encodeURIComponent(resultBlobName)}/pdf-url`)
      
      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          setError('Unable to process PDF for this analysis. The analysis result may not be available.')
          return
        }
        throw new Error(`Status check failed: ${statusResponse.statusText}`)
      }
      
      const statusData = await statusResponse.json()
      
      if (statusData.status === 'not_generated') {
        // Generate PDF first
        const generateResponse = await apiFetch(
          `api/v1/analysis-history/${encodeURIComponent(resultBlobName)}/generate-pdf`,
          { method: 'POST' }
        )
        
        if (!generateResponse.ok) {
          throw new Error(`PDF generation failed: ${generateResponse.statusText}`)
        }
        
        const generateData = await generateResponse.json()
        
        if (generateData.status === 'success' || generateData.status === 'already_exists') {
          // Download the PDF
          window.open(generateData.pdf_url, '_blank')
          setPdfAvailable(true)
        } else {
          throw new Error('PDF generation did not succeed')
        }
      } else if (statusData.status === 'available') {
        // PDF exists, download it
        window.open(statusData.pdf_url, '_blank')
      } else {
        setError('PDF status could not be determined. Please try again.')
      }
    } catch (err) {
      console.error('Error downloading PDF:', err)
      setError(err.message || 'Failed to download PDF. Please try again.')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const fetchDetail = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiFetch(`api/v1/analysis-history/${encodeURIComponent(resultBlobName)}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Analysis result not found')
        }
        throw new Error(`Failed to fetch detail: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load analysis detail')
    } finally {
      setLoading(false)
    }
  }

  const getStatusChip = (status) => {
    if (status === 'success') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Success"
          color="success"
          size="medium"
        />
      )
    } else if (status === 'partial_success') {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Partial Success"
          color="warning"
          size="medium"
        />
      )
    } else if (status === 'failed' || status === 'error') {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Failed"
          color="error"
          size="medium"
        />
      )
    } else {
      return <Chip label={status} size="medium" />
    }
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    try {
      const date = new Date(isoString)
      return date.toLocaleString()
    } catch {
      return isoString
    }
  }

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A'
    try {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const seconds = Math.round((endDate - startDate) / 1000)
      return `${seconds} seconds`
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/analysis-history')}
            sx={{ mb: 2 }}
          >
            Back to History
          </Button>
        </Box>
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    )
  }

  if (!data) return null

  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/analysis-history')}
          sx={{ mb: 2 }}
        >
          Back to History
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">
              Analysis Details
            </Typography>
            {getStatusChip(data.status)}
          </Box>
          <Button
            variant="contained"
            startIcon={downloadingPDF ? <CircularProgress size={20} color="inherit" /> : (pdfAvailable ? <DownloadIcon /> : <PictureAsPdfIcon />)}
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? 'Processing...' : (pdfAvailable ? 'Download PDF' : 'Generate PDF')}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {data.blob_name}
        </Typography>
      </Box>

      {/* Summary Card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Document
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {data.blob_name || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Prompts Processed
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {data.prompts_processed || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Started At
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatDate(data.processing_started_at)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatDuration(data.processing_started_at, data.processing_completed_at)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Errors Section */}
      {data.errors && data.errors.length > 0 && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="error">
              Errors ({data.errors.length})
            </Typography>
            {data.errors.map((error, index) => (
              <Alert severity="error" sx={{ mb: 2 }} key={index}>
                <Typography variant="body2" fontWeight={600}>
                  {error.error_code}: {error.message}
                </Typography>
                {error.detail && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {error.detail}
                  </Typography>
                )}
                {error.context && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Context: {JSON.stringify(error.context)}
                  </Typography>
                )}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {data.results && Object.keys(data.results).length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Results
            </Typography>
            {Object.entries(data.results).map(([promptName, result], index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography fontWeight={600}>{promptName}</Typography>
                    {result.detected && (
                      <Chip label="Issues Detected" color="warning" size="small" />
                    )}
                    {result.findings && (
                      <Chip label={`${result.findings.length} findings`} size="small" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Overall Risk */}
                  {result.overall_risk && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Overall Risk
                      </Typography>
                      <Chip
                        label={result.overall_risk}
                        color={
                          result.overall_risk === 'high' ? 'error' :
                          result.overall_risk === 'medium' ? 'warning' :
                          'success'
                        }
                        size="small"
                      />
                    </Box>
                  )}

                  {/* Findings */}
                  {result.findings && result.findings.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Findings
                      </Typography>
                      {result.findings.map((finding, idx) => (
                        <Card key={idx} sx={{ mb: 1, bgcolor: 'action.hover' }}>
                          <CardContent>
                            <Typography variant="body2" fontWeight={600}>
                              {finding.original_text}
                            </Typography>
                            {finding.compliance_status && (
                              <Chip
                                label={finding.compliance_status}
                                size="small"
                                sx={{ mt: 1 }}
                              />
                            )}
                            {finding.explanation && (
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                {finding.explanation}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}

                  {/* Actions */}
                  {result.actions && result.actions.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommended Actions
                      </Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {result.actions.map((action, idx) => (
                          <li key={idx}>
                            <Typography variant="body2">{action}</Typography>
                          </li>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Raw JSON for debugging */}
                  <Divider sx={{ my: 2 }} />
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="caption">View Raw JSON</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: 'background.paper',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 400,
                          fontSize: '0.75rem'
                        }}
                      >
                        {JSON.stringify(result, null, 2)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {(!data.results || Object.keys(data.results).length === 0) && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              No analysis results available
            </Typography>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  )
}
