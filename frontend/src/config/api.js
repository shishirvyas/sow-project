// API configuration for different environments
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     (import.meta.env.MODE === 'production' 
                       ? 'https://sow-project-backend.onrender.com' 
                       : 'http://127.0.0.1:8000')

export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  
  // In development, use relative URLs (proxy will handle it)
  // In production, use full backend URL
  if (import.meta.env.MODE === 'development') {
    return `/${cleanEndpoint}`
  }
  
  return `${API_BASE_URL}/${cleanEndpoint}`
}

export default {
  getApiUrl,
  API_BASE_URL,
}
