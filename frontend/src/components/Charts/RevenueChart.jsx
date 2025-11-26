import React, { Suspense, lazy } from 'react'
import Box from '@mui/material/Box'

const ReactApexChart = lazy(() => import('react-apexcharts'))

export default function RevenueChart({ height = 300 }) {
  const options = {
    chart: { id: 'revenue', toolbar: { show: false } },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    stroke: { curve: 'smooth' },
    colors: ['#2065d1'],
    grid: { strokeDashArray: 4 },
    tooltip: { theme: 'light' },
  }

  const series = [{ name: 'Revenue', data: [12, 18, 10, 25, 20, 30, 28] }]

  return (
    <Box sx={{ height }}>
      <Suspense fallback={<div>Loading chart...</div>}>
        <ReactApexChart options={options} series={series} type="area" height={height} />
      </Suspense>
    </Box>
  )
}
