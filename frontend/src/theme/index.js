import { createTheme } from '@mui/material/styles'

// Devias-inspired theme polish: richer palette, typography scale, shadows, and component overrides
const baseFont = ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(',')

const shadows = [
  'none',
  '0px 1px 2px rgba(16,24,40,0.04)',
  '0px 2px 6px rgba(16,24,40,0.06)',
  '0px 6px 12px rgba(16,24,40,0.08)',
  '0px 10px 20px rgba(16,24,40,0.10)',
  '0px 14px 28px rgba(16,24,40,0.12)',
  // fill remaining slots with subtle elevated shadows
  ...Array.from({ length: 19 }).map((_, i) => `0px ${18 + i}px ${28 + i * 2}px rgba(16,24,40,${0.06 + i * 0.005})`),
]

const theme = createTheme({
  // standard 8px spacing unit
  spacing: 8,
  palette: {
    primary: {
      light: '#4ea0ff',
      main: '#2065d1',
      dark: '#153e90',
      contrastText: '#fff',
    },
    secondary: {
      light: '#7ea3ff',
      main: '#3366ff',
      dark: '#274bdb',
      contrastText: '#fff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f1724',
      secondary: 'rgba(15,23,36,0.7)',
    },
    divider: 'rgba(15,23,36,0.08)',
  },
  typography: {
    fontFamily: baseFont,
    h1: { fontSize: '2.125rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.75rem', fontWeight: 700 },
    h3: { fontSize: '1.375rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.95rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.95rem', fontWeight: 600 },
    body1: { fontSize: '0.95rem', fontWeight: 400, color: '#0f1724' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows,
  // small tweaks: slightly stronger card elevation and toolbar spacing
  components: {
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
          paddingLeft: 16,
          paddingRight: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: shadows[4],
          transition: 'box-shadow 200ms cubic-bezier(0.4,0,0.2,1), transform 160ms ease',
          '&:hover': {
            boxShadow: shadows[5],
            transform: 'translateY(-2px)'
          }
        },
      },
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f4f6f8' },
        '*, *::before, *::after': { boxSizing: 'border-box' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#fff',
          color: '#0f1724',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(15,23,36,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
        },
        containedPrimary: {
          boxShadow: shadows[3],
        },
        sizeSmall: {
          padding: '6px 12px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: shadows[2],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(15,23,36,0.04)',
          backgroundColor: '#fff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          backgroundColor: 'rgba(2,6,23,0.8)',
        },
      },
    },
  },
})

export default theme
