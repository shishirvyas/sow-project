import React, { Suspense, lazy } from 'react'
import Box from '@mui/material/Box'

const ReactApexChart = lazy(() => import('react-apexcharts'))

export default function TrafficChart({ height = 260 }) {
  const options = {
    chart: { id: 'traffic', toolbar: { show: false } },
    labels: ['Organic', 'Paid', 'Referral', 'Direct'],
    colors: ['#2065d1', '#00bfa5', '#ffb300', '#9c27b0'],
    legend: { position: 'bottom' },
    tooltip: { theme: 'light' },
  }

  const series = [44, 26, 20, 10]

  return (
    <Box sx={{ height }}>
      <Suspense fallback={<div>Loading chart...</div>}>
        <ReactApexChart options={options} series={series} type="donut" height={height} />
      </Suspense>
    </Box>
  )
}
