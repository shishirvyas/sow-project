import React from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import MainLayout from '../layouts/MainLayout'
import RevenueChart from 'src/components/Charts/RevenueChart'
import TrafficChart from 'src/components/Charts/TrafficChart'

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
              <RevenueChart height={300} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Traffic Sources
              </Typography>
              <TrafficChart height={260} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  )
}
