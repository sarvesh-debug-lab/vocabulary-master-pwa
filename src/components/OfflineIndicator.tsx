// src/components/OfflineIndicator.tsx
import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showNotification, setShowNotification] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        setShowNotification(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
  }, [])

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
              isOnline
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5" />
                <span className="font-medium">Back online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5" />
                <span className="font-medium">You are offline</span>
              </>
            )}
            {isOnline && (
              <button
                onClick={() => setShowNotification(false)}
                className="ml-4 text-current opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
