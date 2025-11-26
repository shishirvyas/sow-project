import React from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

const sampleRows = [
  { id: 1, name: 'Project Alpha', status: 'Active', updated: '2h ago' },
  { id: 2, name: 'Project Beta', status: 'On hold', updated: '1d ago' },
  { id: 3, name: 'Project Gamma', status: 'Completed', updated: '3d ago' },
]

export default function DataTable({ title = 'Recent Items' }) {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sampleRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
