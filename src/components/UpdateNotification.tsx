// src/components/UpdateNotification.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface UpdateData {
  type: 'update' | 'installed' | 'error'
  message: string
  timestamp: number
}

export default function UpdateNotification() {
  const [showNotification, setShowNotification] = useState(false)
  const [updateData, setUpdateData] = useState<UpdateData | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Handle service worker updates
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller
      
      if (controller) {
        // Listen for controller change (new service worker activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service worker controller changed - app updated')
          showUpdateNotification('installed', 'App updated successfully! Refresh to see changes.')
        })
      }

      // Listen for waiting service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          console.log('Update available:', event.data)
          showUpdateNotification('update', 'A new version is available. Update now?')
        }
      })
    }

    // Check for app updates on load
    checkForUpdates()

    // Listen for beforeinstallprompt event (PWA installation)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show install prompt if user hasn't installed yet
      const isInstalled = localStorage.getItem('pwa_installed') === 'true'
      if (!isInstalled) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 3000) // Show after 3 seconds
      }
    })

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully')
      localStorage.setItem('pwa_installed', 'true')
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      showUpdateNotification('installed', 'App installed successfully!')
    })

    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {})
      window.removeEventListener('appinstalled', () => {})
    }
  }, [])

  const checkForUpdates = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        
        if (registration) {
          // Check for updates
          await registration.update()
          
          // Check if there's a waiting service worker
          if (registration.waiting) {
            showUpdateNotification('update', 'A new version is available. Update now?')
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }

  const showUpdateNotification = (type: UpdateData['type'], message: string) => {
    setUpdateData({
      type,
      message,
      timestamp: Date.now()
    })
    setShowNotification(true)
    
    // Auto-hide success messages after 5 seconds
    if (type === 'installed') {
      setTimeout(() => {
        setShowNotification(false)
      }, 5000)
    }
  }

  const handleUpdate = async () => {
    if (!('serviceWorker' in navigator)) return
    
    try {
      setIsUpdating(true)
      
      const registration = await navigator.serviceWorker.getRegistration()
      
      if (registration && registration.waiting) {
        // Send skipWaiting message to the waiting service worker
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Reload page to activate new service worker
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        // Just reload to get latest version
        window.location.reload()
      }
    } catch (error) {
      console.error('Error during update:', error)
      showUpdateNotification('error', 'Failed to update. Please try again.')
      setIsUpdating(false)
    }
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    try {
      // Show the install prompt
      deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`User response to the install prompt: ${outcome}`)
      
      // Clear the deferred prompt
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      
      if (outcome === 'accepted') {
        showUpdateNotification('installed', 'Installing app...')
      }
    } catch (error) {
      console.error('Error during installation:', error)
      showUpdateNotification('error', 'Installation failed. Please try again.')
    }
  }

  const getNotificationIcon = (type: UpdateData['type']) => {
    switch (type) {
      case 'update':
        return <RefreshCw className="h-5 w-5" />
      case 'installed':
        return <CheckCircle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getNotificationColor = (type: UpdateData['type']) => {
    switch (type) {
      case 'update':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'installed':
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
  }

  const getNotificationTitle = (type: UpdateData['type']) => {
    switch (type) {
      case 'update':
        return 'Update Available'
      case 'installed':
        return 'Success!'
      case 'error':
        return 'Error'
      default:
        return 'Notification'
    }
  }

  return (
    <>
      {/* PWA Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 max-w-md"
            role="dialog"
            aria-labelledby="install-prompt-title"
          >
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg shadow-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 id="install-prompt-title" className="font-bold text-lg mb-1">
                      Install Vocabulary Master
                    </h3>
                    <p className="text-primary-100 text-sm">
                      Install this app on your device for a better experience and offline access.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="text-white/70 hover:text-white ml-4"
                  aria-label="Close install prompt"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-white text-primary-600 hover:bg-primary-50 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Install App
                </button>
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Notification */}
      <AnimatePresence>
        {showNotification && updateData && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4"
            role="alert"
            aria-labelledby="update-notification-title"
          >
            <div className={`rounded-lg shadow-xl border p-4 ${getNotificationColor(updateData.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(updateData.type)}
                  </div>
                  <div>
                    <h3 id="update-notification-title" className="font-bold text-sm mb-1">
                      {getNotificationTitle(updateData.type)}
                    </h3>
                    <p className="text-sm opacity-90">
                      {updateData.message}
                    </p>
                    
                    {/* Update-specific actions */}
                    {updateData.type === 'update' && (
                      <div className="flex space-x-3 mt-3">
                        <button
                          onClick={handleUpdate}
                          disabled={isUpdating}
                          className="text-sm font-medium px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          {isUpdating ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                              Updating...
                            </span>
                          ) : (
                            'Update Now'
                          )}
                        </button>
                        <button
                          onClick={() => setShowNotification(false)}
                          className="text-sm font-medium px-4 py-1.5 bg-transparent hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          Later
                        </button>
                      </div>
                    )}
                    
                    {/* Success message with auto-refresh option */}
                    {updateData.type === 'installed' && (
                      <div className="mt-3">
                        <button
                          onClick={() => window.location.reload()}
                          className="text-sm font-medium px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Refresh Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Close button for non-update notifications */}
                {updateData.type !== 'update' && (
                  <button
                    onClick={() => setShowNotification(false)}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Close notification"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Progress bar for auto-dismiss */}
              {updateData.type === 'installed' && (
                <div className="mt-3 h-1 bg-current/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-current/40"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    onAnimationComplete={() => setShowNotification(false)}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Update Check Button (Optional - can be placed in Settings) */}
      <div className="hidden">
        <button
          onClick={checkForUpdates}
          className="fixed bottom-4 right-4 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg"
          aria-label="Check for updates"
          title="Check for updates"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}
