import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { apiFetch } from '../config/api'

const AnalysisHistoryContext = createContext(null)

export const useAnalysisHistory = () => {
  const context = useContext(AnalysisHistoryContext)
  if (!context) {
    throw new Error('useAnalysisHistory must be used within an AnalysisHistoryProvider')
  }
  return context
}

export const AnalysisHistoryProvider = ({ children }) => {
  const [history, setHistory] = useState([])
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const fetchingRef = useRef(false)

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30000

  const isCacheValid = useCallback(() => {
    if (!lastFetch) return false
    return Date.now() - lastFetch < CACHE_DURATION
  }, [lastFetch])

  const fetchHistory = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      console.log('📦 Using cached analysis history')
      return { history, successCount, errorCount }
    }

    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      console.log('⏳ Fetch already in progress, waiting...')
      return { history, successCount, errorCount }
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      console.log('🔄 Fetching fresh analysis history from API')
      const response = await apiFetch('analysis-history')

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`)
      }

      const data = await response.json()
      setHistory(data.history || [])
      setSuccessCount(data.success_count || 0)
      setErrorCount(data.error_count || 0)
      setLastFetch(Date.now())

      console.log('✅ Analysis history cached:', {
        items: data.history?.length || 0,
        success: data.success_count,
        errors: data.error_count
      })

      return {
        history: data.history || [],
        successCount: data.success_count || 0,
        errorCount: data.error_count || 0
      }
    } catch (error) {
      console.error('❌ Error fetching analysis history:', error)
      throw error
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [history, successCount, errorCount, isCacheValid])

  // Get today's completed analyses (from cache)
  const getTodaysAnalyses = useCallback(() => {
    const isToday = (dateString) => {
      if (!dateString) return false
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return false
        const today = new Date()
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear()
      } catch {
        return false
      }
    }

    const completed = history.filter(item =>
      ['success', 'partial_success', 'completed', 'partial'].includes(item.status)
    )

    let todaysCompleted = completed.filter(item => {
      const completedToday = isToday(item.analysis_date || item.processing_completed_at)
      const createdToday = isToday(item.upload_date || item.created)
      return completedToday || createdToday
    })

    // Fallback: last 24 hours if nothing today
    if (todaysCompleted.length === 0) {
      const last24Hours = new Date()
      last24Hours.setHours(last24Hours.getHours() - 24)

      todaysCompleted = completed.filter(item => {
        const itemDate = new Date(item.analysis_date || item.processing_completed_at || item.upload_date || item.created)
        return itemDate >= last24Hours
      }).slice(0, 3)
    }

    return todaysCompleted.slice(0, 3)
  }, [history])

  // Invalidate cache (call this after upload or analysis completion)
  const invalidateCache = useCallback(() => {
    console.log('🗑️ Cache invalidated')
    setLastFetch(null)
  }, [])

  const value = {
    history,
    successCount,
    errorCount,
    loading,
    lastFetch,
    isCacheValid: isCacheValid(),
    fetchHistory,
    getTodaysAnalyses,
    invalidateCache
  }

  return (
    <AnalysisHistoryContext.Provider value={value}>
      {children}
    </AnalysisHistoryContext.Provider>
  )
}
