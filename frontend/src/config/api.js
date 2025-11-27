// API configuration for different environments
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     (import.meta.env.MODE === 'production' 
                       ? 'https://sow-project-backend.onrender.com' 
                       : 'http://127.0.0.1:8000')

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  
  // Always use full backend URL with /api/v1 prefix
  return `${API_BASE_URL}/api/v1/${cleanEndpoint}`
}

// API Logger - logs all API calls with request/response details
const logApiCall = (method, url, options, startTime) => {
  const duration = Date.now() - startTime
  const timestamp = new Date().toISOString()
  
  console.group(`🌐 API Call: ${method} ${url}`)
  console.log(`⏰ Timestamp: ${timestamp}`)
  console.log(`📍 Full URL: ${url}`)
  console.log(`⏱️ Duration: ${duration}ms`)
  
  if (options?.body) {
    if (options.body instanceof FormData) {
      console.log('📤 Request Body: [FormData]')
      for (let [key, value] of options.body.entries()) {
        if (value instanceof File) {
          console.log(`  - ${key}: [File] ${value.name} (${value.size} bytes)`)
        } else {
          console.log(`  - ${key}:`, value)
        }
      }
    } else {
      try {
        console.log('📤 Request Body:', JSON.parse(options.body))
      } catch {
        console.log('📤 Request Body:', options.body)
      }
    }
  }
  
  if (options?.headers) {
    console.log('📋 Request Headers:', options.headers)
  }
  
  console.groupEnd()
}

const logApiResponse = (method, url, response, data, startTime) => {
  const duration = Date.now() - startTime
  const timestamp = new Date().toISOString()
  
  const statusEmoji = response.ok ? '✅' : '❌'
  
  console.group(`${statusEmoji} API Response: ${method} ${url}`)
  console.log(`⏰ Timestamp: ${timestamp}`)
  console.log(`📍 Full URL: ${url}`)
  console.log(`⏱️ Total Duration: ${duration}ms`)
  console.log(`📊 Status: ${response.status} ${response.statusText}`)
  console.log(`📥 Response Data:`, data)
  console.groupEnd()
}

const logApiError = (method, url, error, startTime) => {
  const duration = Date.now() - startTime
  const timestamp = new Date().toISOString()
  
  console.group(`🚨 API Error: ${method} ${url}`)
  console.log(`⏰ Timestamp: ${timestamp}`)
  console.log(`📍 Full URL: ${url}`)
  console.log(`⏱️ Duration: ${duration}ms`)
  console.error('❌ Error:', error)
  console.groupEnd()
}

// Enhanced fetch wrapper with logging and authentication
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint)
  const method = options.method || 'GET'
  const startTime = Date.now()
  
  // Add authentication token if available
  const token = localStorage.getItem('access_token')
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    }
  }
  
  // Log the API call
  logApiCall(method, url, options, startTime)
  
  try {
    const response = await fetch(url, options)
    
    // Check if response is binary (PDF, images, etc.)
    const contentType = response.headers.get('content-type') || ''
    const isBinary = contentType.includes('application/pdf') || 
                     contentType.includes('application/octet-stream') ||
                     contentType.includes('image/')
    
    if (isBinary) {
      // For binary responses, just log without reading body
      console.group(`✅ API Response: ${method} ${url}`)
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
      console.log(`📍 Full URL: ${url}`)
      console.log(`⏱️ Total Duration: ${Date.now() - startTime}ms`)
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      console.log(`📥 Response: [Binary Data] ${contentType}`)
      console.groupEnd()
      
      return response
    }
    
    // Clone response to read body without consuming it (for non-binary)
    const clonedResponse = response.clone()
    let data
    
    try {
      data = await clonedResponse.json()
    } catch {
      data = await clonedResponse.text()
    }
    
    // Log the response
    logApiResponse(method, url, response, data, startTime)
    
    return response
  } catch (error) {
    // Log the error
    logApiError(method, url, error, startTime)
    throw error
  }
}

export default {
  getApiUrl,
  apiFetch,
  API_BASE_URL,
}
