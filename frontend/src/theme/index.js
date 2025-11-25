import { createTheme } from '@mui/material/styles'

// Devias-inspired theme polish: richer palette, typography scale, shadows, and component overrides
const baseFont = ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(',')

const lightShadows = [
  'none',
  '0px 1px 2px rgba(16,24,40,0.04)',
  '0px 2px 6px rgba(16,24,40,0.06)',
  '0px 6px 12px rgba(16,24,40,0.08)',
  '0px 10px 20px rgba(16,24,40,0.10)',
  '0px 14px 28px rgba(16,24,40,0.12)',
  ...Array.from({ length: 19 }).map((_, i) => `0px ${18 + i}px ${28 + i * 2}px rgba(16,24,40,${0.06 + i * 0.005})`),
]

const darkShadows = [
  'none',
  '0px 1px 2px rgba(0,0,0,0.24)',
  '0px 2px 6px rgba(0,0,0,0.28)',
  '0px 6px 12px rgba(0,0,0,0.32)',
  '0px 10px 20px rgba(0,0,0,0.36)',
  '0px 14px 28px rgba(0,0,0,0.40)',
  ...Array.from({ length: 19 }).map((_, i) => `0px ${18 + i}px ${28 + i * 2}px rgba(0,0,0,${0.24 + i * 0.01})`),
]

export const getTheme = (mode = 'light') => {
  const isDark = mode === 'dark'
  const shadows = isDark ? darkShadows : lightShadows

  return createTheme({
    // standard 8px spacing unit
    spacing: 8,
    palette: {
      mode,
      primary: {
        light: isDark ? '#5fa5ff' : '#4ea0ff',
        main: isDark ? '#3d8bfd' : '#2065d1',
        dark: isDark ? '#2563d1' : '#153e90',
        contrastText: '#fff',
      },
      secondary: {
        light: isDark ? '#8fb3ff' : '#7ea3ff',
        main: isDark ? '#5c8dff' : '#3366ff',
        dark: isDark ? '#4373db' : '#274bdb',
        contrastText: '#fff',
      },
      background: {
        default: isDark ? '#0a0e1a' : '#f4f6f8',
        paper: isDark ? '#161b2e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f1f3f5' : '#0f1724',
        secondary: isDark ? 'rgba(241,243,245,0.7)' : 'rgba(15,23,36,0.7)',
      },
      divider: isDark ? 'rgba(241,243,245,0.08)' : 'rgba(15,23,36,0.08)',
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
      body1: { fontSize: '0.95rem', fontWeight: 400 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: isDark ? '#0a0e1a' : '#f4f6f8' },
          '*, *::before, *::after': { boxSizing: 'border-box' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark ? '#161b2e' : '#fff',
            color: isDark ? '#f1f3f5' : '#0f1724',
            boxShadow: 'none',
            borderBottom: isDark ? '1px solid rgba(241,243,245,0.08)' : '1px solid rgba(15,23,36,0.06)',
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
            transition: 'box-shadow 200ms cubic-bezier(0.4,0,0.2,1), transform 160ms ease',
            '&:hover': {
              boxShadow: shadows[5],
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: isDark ? '1px solid rgba(241,243,245,0.08)' : '1px solid rgba(15,23,36,0.04)',
            backgroundColor: isDark ? '#161b2e' : '#fff',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 64,
            paddingLeft: 16,
            paddingRight: 16,
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
            backgroundColor: isDark ? 'rgba(241,243,245,0.9)' : 'rgba(2,6,23,0.8)',
            color: isDark ? '#0a0e1a' : '#fff',
          },
        },
      },
    },
  })
}

export default getTheme('light')
