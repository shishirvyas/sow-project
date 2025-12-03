import React from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import RefreshIcon from '@mui/icons-material/Refresh'
import Snackbar from '@mui/material/Snackbar'

export default function AnalysisHistory() {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [history, setHistory] = React.useState([])
  const [successCount, setSuccessCount] = React.useState(0)
  const [errorCount, setErrorCount] = React.useState(0)
  const [tabValue, setTabValue] = React.useState(0) // 0 = All, 1 = Success, 2 = Errors
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)
  const [pdfGenerating, setPdfGenerating] = React.useState({})
  const [pdfErrors, setPdfErrors] = React.useState({})
  const [retriggerLoading, setRetriggerLoading] = React.useState({})
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' })

  React.useEffect(() => {
    fetchHistory()
  }, [])

  const handleRetriggerAnalysis = async (event, blobName) => {
    event.stopPropagation() // Prevent row click
    
    console.log(`[RETRIGGER] Starting analysis for: ${blobName}`)
    
    setRetriggerLoading(prev => ({ ...prev, [blobName]: true }))
    
    try {
      const response = await apiFetch(`process-sow/${encodeURIComponent(blobName)}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || 'Failed to retrigger analysis')
      }
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Analysis started! We will notify you when complete.',
        severity: 'info'
      })
      
      // Update the document status to processing in the UI
      setHistory(prev => prev.map(item => 
        item.blob_name === blobName || item.source_blob === blobName
          ? { ...item, status: 'processing' }
          : item
      ))
      
      // Refresh history after a short delay to show processing status
      setTimeout(() => {
        fetchHistory()
      }, 2000)
      
    } catch (err) {
      console.error('[RETRIGGER] Error:', err)
      setSnackbar({
        open: true,
        message: err.message || 'Failed to retrigger analysis',
        severity: 'error'
      })
    } finally {
      setRetriggerLoading(prev => ({ ...prev, [blobName]: false }))
    }
  }

  const handleDownloadPDF = async (event, resultBlobName) => {
    event.stopPropagation() // Prevent row click
    
    console.log(`[PDF DOWNLOAD] Starting download for: ${resultBlobName}`)
    
    // Set generating state
    setPdfGenerating(prev => ({ ...prev, [resultBlobName]: true }))
    setPdfErrors(prev => ({ ...prev, [resultBlobName]: null }))
    
    try {
      // First check if PDF exists
      console.log(`[PDF DOWNLOAD] Checking PDF status...`)
      const statusResponse = await apiFetch(`analysis-history/${encodeURIComponent(resultBlobName)}/pdf-url`)
      
      // Handle 404 or other errors
      if (!statusResponse.ok) {
        if (statusResponse.status === 404) {
          // Analysis result not found - mark as error
          setPdfErrors(prev => ({ ...prev, [resultBlobName]: 'Analysis not found' }))
          return
        }
        throw new Error(`Status check failed: ${statusResponse.statusText}`)
      }
      
      const statusData = await statusResponse.json()
      console.log(`[PDF DOWNLOAD] Status response:`, statusData)
      
      if (statusData.status === 'not_generated') {
        // Generate PDF first
        console.log(`[PDF DOWNLOAD] PDF not generated, generating now...`)
        const generateResponse = await apiFetch(
          `analysis-history/${encodeURIComponent(resultBlobName)}/generate-pdf`,
          { method: 'POST' }
        )
        
        if (!generateResponse.ok) {
          throw new Error(`PDF generation failed: ${generateResponse.statusText}`)
        }
        
        const generateData = await generateResponse.json()
        
        if (generateData.status === 'success' || generateData.status === 'already_exists') {
          console.log(`[PDF DOWNLOAD] PDF generated successfully, downloading...`)
          // Download the PDF via API endpoint
          const downloadResponse = await apiFetch(
            `analysis-history/${encodeURIComponent(resultBlobName)}/download-pdf`
          )
          
          console.log(`[PDF DOWNLOAD] Download response status: ${downloadResponse.status}`)
          console.log(`[PDF DOWNLOAD] Download response content-type: ${downloadResponse.headers.get('content-type')}`)
          
          if (!downloadResponse.ok) {
            throw new Error(`PDF download failed: ${downloadResponse.statusText}`)
          }
          
          // Get the PDF blob and trigger download
          console.log(`[PDF DOWNLOAD] Reading response as blob...`)
          const blob = await downloadResponse.blob()
          console.log(`[PDF DOWNLOAD] Blob size: ${blob.size} bytes, type: ${blob.type}`)
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${resultBlobName.replace('.json', '')}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          // Update history to reflect PDF is now available
          setHistory(prev => prev.map(item => 
            item.result_blob_name === resultBlobName 
              ? { ...item, pdf_available: true, pdf_url: generateData.pdf_url }
              : item
          ))
        } else {
          throw new Error('PDF generation did not succeed')
        }
      } else if (statusData.status === 'available') {
        console.log(`[PDF DOWNLOAD] PDF already available, downloading directly...`)
        // PDF exists, download it via API endpoint
        const downloadResponse = await apiFetch(
          `analysis-history/${encodeURIComponent(resultBlobName)}/download-pdf`
        )
        
        console.log(`[PDF DOWNLOAD] Download response status: ${downloadResponse.status}`)
        console.log(`[PDF DOWNLOAD] Download response content-type: ${downloadResponse.headers.get('content-type')}`)
        
        if (!downloadResponse.ok) {
          throw new Error(`PDF download failed: ${downloadResponse.statusText}`)
        }
        
        // Get the PDF blob and trigger download
        console.log(`[PDF DOWNLOAD] Reading response as blob...`)
        const blob = await downloadResponse.blob()
        console.log(`[PDF DOWNLOAD] Blob size: ${blob.size} bytes, type: ${blob.type}`)
        console.log(`[PDF DOWNLOAD] Creating download link...`)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resultBlobName.replace('.json', '')}.pdf`
        document.body.appendChild(a)
        console.log(`[PDF DOWNLOAD] Triggering download for: ${a.download}`)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log(`[PDF DOWNLOAD] Download completed successfully`)
      } else {
        console.warn(`[PDF DOWNLOAD] Unknown PDF status: ${statusData.status}`)
        setPdfErrors(prev => ({ ...prev, [resultBlobName]: 'PDF status unknown' }))
      }
    } catch (err) {
      console.error('[PDF DOWNLOAD] Error:', err)
      setPdfErrors(prev => ({ ...prev, [resultBlobName]: err.message || 'Download failed' }))
    } finally {
      setPdfGenerating(prev => ({ ...prev, [resultBlobName]: false }))
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiFetch('analysis-history')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`)
      }
      
      const data = await response.json()
      setHistory(data.history || [])
      setSuccessCount(data.success_count || 0)
      setErrorCount(data.error_count || 0)
    } catch (err) {
      setError(err.message || 'Failed to load analysis history')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
    setPage(0) // Reset to first page when changing tabs
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const getStatusChip = (status, hasErrors) => {
    if (status === 'completed' || status === 'success') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Success"
          color="success"
          size="small"
        />
      )
    } else if (status === 'partial_success' || status === 'partial') {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Partial"
          color="warning"
          size="small"
        />
      )
    } else if (status === 'failed' || status === 'error') {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Failed"
          color="error"
          size="small"
        />
      )
    } else if (status === 'processing') {
      return (
        <Chip
          label="Processing"
          color="info"
          size="small"
        />
      )
    } else if (status === 'pending') {
      return (
        <Chip
          label="Pending"
          color="default"
          size="small"
        />
      )
    } else {
      return (
        <Chip
          label={status}
          size="small"
        />
      )
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

  const getPDFIconAndTooltip = (item) => {
    const resultBlobName = item.result_blob_name
    
    // Check if there's an error
    if (pdfErrors[resultBlobName]) {
      return {
        icon: <ErrorIcon sx={{ color: 'error.main' }} />,
        tooltip: `PDF Error: ${pdfErrors[resultBlobName]}`,
        color: 'error',
        disabled: true
      }
    }
    
    // Check if generating
    if (pdfGenerating[resultBlobName]) {
      return {
        icon: <CircularProgress size={20} />,
        tooltip: 'Generating PDF...',
        color: 'primary',
        disabled: true
      }
    }
    
    // Check if available
    if (item.pdf_available) {
      return {
        icon: <DownloadIcon />,
        tooltip: 'Download PDF Report',
        color: 'success',
        disabled: false
      }
    }
    
    // Not generated yet
    return {
      icon: <PictureAsPdfIcon />,
      tooltip: 'Generate PDF Report',
      color: 'primary',
      disabled: false
    }
  }

  // Filter history based on selected tab
  const filteredHistory = React.useMemo(() => {
    if (tabValue === 0) {
      return history // All
    } else if (tabValue === 1) {
      return history.filter(item => 
        item.status === 'completed' || 
        item.status === 'success' || 
        item.status === 'partial_success' ||
        item.status === 'partial'
      )
    } else {
      return history.filter(item => 
        item.status === 'failed' || item.status === 'error'
      )
    }
  }, [history, tabValue])

  // Paginated data
  const paginatedHistory = React.useMemo(() => {
    const start = page * rowsPerPage
    return filteredHistory.slice(start, start + rowsPerPage)
  }, [filteredHistory, page, rowsPerPage])

  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analysis History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View all document analysis results and their status
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`All (${history.length})`} />
            <Tab label={`Success (${successCount})`} />
            <Tab label={`Errors (${errorCount})`} />
          </Tabs>
        </Box>

        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No analysis history found
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Document</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} align="right">Prompts</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} align="right">Errors</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Started</TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Duration</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedHistory.map((item, index) => {
                      // Truncate filename for mobile
                      const truncateFilename = (name, maxLength = 30) => {
                        if (name.length <= maxLength) return name
                        return name.substring(0, maxLength) + '...'
                      }

                      return (
                        <Tooltip
                          key={item.result_blob_name || item.document_id || index}
                          title={item.result_blob_name ? "Click to view analysis details" : "Not yet analyzed"}
                          placement="left"
                        >
                          <TableRow
                            hover
                            onClick={() => item.result_blob_name && navigate(`/analysis-history/${encodeURIComponent(item.result_blob_name)}`)}
                            sx={{
                              cursor: item.result_blob_name ? 'pointer' : 'default',
                              opacity: item.result_blob_name ? 1 : 0.6,
                              '&:hover': item.result_blob_name ? {
                                bgcolor: 'action.hover',
                              } : {},
                            }}
                          >
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                fontWeight={600}
                                sx={{
                                  display: { xs: 'block', sm: 'block' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: { xs: 'nowrap', sm: 'normal' },
                                  maxWidth: { xs: '150px', sm: '250px', md: 'none' }
                                }}
                              >
                                {truncateFilename(item.original_filename || item.source_blob, 50)}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: { xs: 'none', sm: 'block' } }}
                              >
                                {item.uploaded_by_name && `Uploaded by: ${item.uploaded_by_name}`}
                                {item.upload_date && ` • ${formatDate(item.upload_date)}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {getStatusChip(item.status, item.has_errors)}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} align="right">
                              {item.prompts_processed || 0}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} align="right">
                              {item.error_count > 0 ? (
                                <Chip
                                  label={item.error_count}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              <Typography variant="body2">
                                {formatDate(item.analysis_date || item.upload_date)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                              <Typography variant="body2">
                                {item.analysis_duration_ms 
                                  ? `${(item.analysis_duration_ms / 1000).toFixed(1)}s` 
                                  : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                {/* Retrigger Analysis Button - shown for pending, failed, or partial */}
                                {(item.status === 'pending' || item.status === 'failed' || item.status === 'partial') && (
                                  <Tooltip title="Retrigger analysis for this document">
                                    <span>
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={(e) => handleRetriggerAnalysis(e, item.blob_name || item.source_blob)}
                                        disabled={retriggerLoading[item.blob_name || item.source_blob] || item.status === 'processing'}
                                      >
                                        {retriggerLoading[item.blob_name || item.source_blob] ? (
                                          <CircularProgress size={20} />
                                        ) : (
                                          <RefreshIcon />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                                
                                {/* PDF Download Button - shown only if analysis completed */}
                                {item.result_blob_name && (
                                  (() => {
                                    const pdfStatus = getPDFIconAndTooltip(item)
                                    return (
                                      <Tooltip title={pdfStatus.tooltip}>
                                        <span>
                                          <IconButton
                                            size="small"
                                            color={pdfStatus.color}
                                            onClick={(e) => handleDownloadPDF(e, item.result_blob_name)}
                                            disabled={pdfStatus.disabled}
                                          >
                                            {pdfStatus.icon}
                                          </IconButton>
                                        </span>
                                      </Tooltip>
                                    )
                                  })()
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        </Tooltip>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredHistory.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  )
}
