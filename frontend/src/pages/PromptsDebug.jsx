import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function PromptsDebug() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await apiFetch('prompts');
      const json = await response.json();
      setData(json);
      console.log('Raw data:', json);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Prompts Debug View</Typography>
        <Button variant="contained" onClick={fetchData} sx={{ mb: 2 }}>
          Refresh Data
        </Button>

        {error && (
          <Paper sx={{ p: 2, bgcolor: 'error.light', mb: 2 }}>
            <Typography color="error">Error: {error}</Typography>
          </Paper>
        )}

        {data && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Response Data:</Typography>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(data, null, 2)}
            </Typography>
          </Paper>
        )}

        {data?.prompts && data.prompts.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Prompts Table:</Typography>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Clause ID</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Active</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Variables</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.prompts.map((prompt, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{String(prompt.id)}</td>
                    <td style={{ padding: '8px' }}>{String(prompt.clause_id)}</td>
                    <td style={{ padding: '8px' }}>{String(prompt.name)}</td>
                    <td style={{ padding: '8px' }}>{String(prompt.is_active)}</td>
                    <td style={{ padding: '8px' }}>{String(prompt.variable_count)}</td>
                    <td style={{ padding: '8px' }}>{String(prompt.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}
