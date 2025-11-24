import React, { Suspense, lazy } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import MainLayout from '../layouts/MainLayout'
// use React.lazy to dynamically load react-apexcharts
const ReactApexChart = lazy(() => import('react-apexcharts'))

const summary = [
  { title: 'Users', value: '3,482' },
  { title: 'Orders', value: '1,204' },
  { title: 'Revenue', value: '$87.3k' },
]

const chartOptions = {
  chart: { id: 'revenue', toolbar: { show: false } },
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  stroke: { curve: 'smooth' },
  colors: ['#2065d1'],
  grid: { strokeDashArray: 4 },
}

const chartSeries = [{ name: 'Revenue', data: [12, 18, 10, 25, 20, 30, 28] }]

export default function Dashboard() {
  return (
    <MainLayout>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 2 }}>
        {summary.map((s) => (
          <Grid item xs={12} sm={4} key={s.title}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {s.title}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Revenue
              </Typography>
              <Box sx={{ height: 300 }}>
                <Suspense fallback={<div>Loading chart...</div>}>
                  <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={300} />
                </Suspense>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - 12 new users signed up
                <br />- 7 orders placed
                <br />- Server uptime stable
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  )
}
