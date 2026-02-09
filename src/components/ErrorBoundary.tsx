// src/components/ErrorBoundary.tsx
import React from 'react'
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { storage } from '@/services/storage.service'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate()
  const isProduction = process.env.NODE_ENV === 'production'

  const clearData = () => {
    if (window.confirm('This will delete all your vocabulary data. Are you sure?')) {
      try {
        storage.clearAppData()
        window.location.reload()
      } catch {
        window.location.reload()
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={resetErrorBoundary}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Try again
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Dashboard
            </button>
            
            <button
              onClick={clearData}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Clear App Data & Reload
            </button>
          </div>
          
          {!isProduction && (
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-40">
                  {error.stack}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
            }
