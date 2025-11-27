import React from 'react'
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from './index'

const THEME_KEY = 'skope360_theme_mode'

export const ThemeContext = React.createContext({
  mode: 'light',
  toggleTheme: () => {},
})

export default function ThemeProvider({ children }) {
  const [mode, setMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY)
      return stored === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  const toggleTheme = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const theme = React.useMemo(() => getTheme(mode), [mode])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
