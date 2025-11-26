import React from 'react'
import { useNavigate } from 'react-router-dom'
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

  React.useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiFetch('api/v1/analysis-history')
      
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
    if (status === 'success') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Success"
          color="success"
          size="small"
        />
      )
    } else if (status === 'partial_success') {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Partial Success"
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
      return `${seconds}s`
    } catch {
      return 'N/A'
    }
  }

  // Filter history based on selected tab
  const filteredHistory = React.useMemo(() => {
    if (tabValue === 0) {
      return history // All
    } else if (tabValue === 1) {
      return history.filter(item => 
        item.status === 'success' || item.status === 'partial_success'
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
                      <TableCell align="right">Prompts</TableCell>
                      <TableCell align="right">Errors</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedHistory.map((item, index) => (
                      <Tooltip
                        key={item.result_blob_name || index}
                        title="Click to view details"
                        placement="left"
                      >
                        <TableRow
                          hover
                          onClick={() => navigate(`/analysis-history/${encodeURIComponent(item.result_blob_name)}`)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            }
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.source_blob}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.result_blob_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(item.status, item.has_errors)}
                          </TableCell>
                          <TableCell align="right">
                            {item.prompts_processed || 0}
                          </TableCell>
                          <TableCell align="right">
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
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(item.processing_started_at || item.created)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDuration(item.processing_started_at, item.processing_completed_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </Tooltip>
                    ))}
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
    </MainLayout>
  )
}
