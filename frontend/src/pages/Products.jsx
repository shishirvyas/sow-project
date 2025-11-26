import React, { useState } from 'react'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

const sampleProducts = [
  { id: 1, name: 'Product A', price: '$29', tags: ['new', 'popular'] },
  { id: 2, name: 'Product B', price: '$59', tags: ['sale'] },
  { id: 3, name: 'Product C', price: '$99', tags: ['premium'] },
  { id: 4, name: 'Product D', price: '$19', tags: ['budget'] },
  { id: 5, name: 'Product E', price: '$149', tags: ['premium', 'popular'] },
]

export default function Products() {
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const tags = Array.from(new Set(sampleProducts.flatMap((p) => p.tags)))

  const filtered = sampleProducts.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase())
    const matchesTag = tagFilter ? p.tags.includes(tagFilter) : true
    return matchesQuery && matchesTag
  })

  return (
    <MainLayout>
      <Typography variant="h4" gutterBottom>
        Products
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          label="Search products"
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Filter:
          </Typography>
          {['', ...tags].map((t) => (
            <Chip
              key={t || 'all'}
              label={t || 'All'}
              color={t === tagFilter ? 'primary' : 'default'}
              onClick={() => setTagFilter(t)}
              size="small"
            />
          ))}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {filtered.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{p.name}</Typography>
                <Typography color="text.secondary">{p.price}</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>{p.tags.map((t) => <Chip key={t} label={t} size="small" />)}</Box>
              </CardContent>
              <CardActions>
                <Button size="small">View</Button>
                <Button size="small" variant="contained">
                  Buy
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </MainLayout>
  )
}
