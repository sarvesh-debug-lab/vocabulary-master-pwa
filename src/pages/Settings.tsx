// src/pages/Settings.tsx
import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, Moon, Sun, Bell, Volume2, 
  Target, Download, Upload, Trash2, Shield,
  Languages, Keyboard, Zap, Database, User
} from 'lucide-react'
import { useStore } from '@/store/store'
import { storage } from '@/services/storage.service'
import { toast } from 'react-hot-toast'

export default function Settings() {
  const { 
    darkMode, 
    toggleDarkMode,
    studySettings,
    updateStudySettings
  } = useStore()
  
  const [settings, setSettings] = useState({
    dailyGoal: 20,
    enableNotifications: true,
    autoPlayAudio: false,
    defaultMode: 'flashcard' as 'flashcard' | 'quiz' | 'typing' | 'matching',
    showHints: true,
    difficultyFilter: ['beginner', 'intermediate', 'advanced'],
    tagsFilter: [] as string[],
    language: 'en',
    keyboardShortcuts: true,
    autoSave: true,
    dataBackup: true
  })

  const [storageStats, setStorageStats] = useState({
    totalSize: '0KB',
    wordsCount: 0,
    sessionsCount: 0
  })

  useEffect(() => {
    // Load settings from store
    if (studySettings) {
      setSettings(prev => ({
        ...prev,
        ...studySettings
      }))
    }

    // Calculate storage usage
    calculateStorageStats()
  }, [studySettings])

  const calculateStorageStats = () => {
    try {
      const words = storage.getAllWords()
      const sessions = storage.getAllSessions()
      
      // Calculate approximate storage size
      const data = storage.exportData()
      const sizeInKB = Math.round(data.length / 1024)
      
      setStorageStats({
        totalSize: `${sizeInKB}KB`,
        wordsCount: words.length,
        sessionsCount: sessions.length
      })
    } catch (error) {
      console.error('Error calculating storage stats:', error)
    }
  }

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    updateStudySettings(newSettings)
    
    // Show success message
    toast.success('Settings updated')
  }

  const handleExportData = () => {
    try {
      const data = storage.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vocabulary-master-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!window.confirm('Importing data will replace your current vocabulary. Continue?')) {
      return
    }

    try {
      const text = await file.text()
      const result = storage.importData(text)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} words`)
        calculateStorageStats()
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data')
    }
    
    // Reset file input
    event.target.value = ''
  }

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone!')) {
      try {
        storage.clearAppData()
        calculateStorageStats()
        toast.success('All data cleared successfully')
      } catch (error) {
        toast.error('Failed to clear data')
      }
    }
  }

  const handleResetSettings = () => {
    if (window.confirm('Reset all settings to default?')) {
      const defaultSettings = {
        dailyGoal: 20,
        enableNotifications: true,
        autoPlayAudio: false,
        defaultMode: 'flashcard' as 'flashcard' | 'quiz' | 'typing' | 'matching',
        showHints: true,
        difficultyFilter: ['beginner', 'intermediate', 'advanced'],
        tagsFilter: [] as string[],
        language: 'en',
        keyboardShortcuts: true,
        autoSave: true,
        dataBackup: true
      }
      
      setSettings(defaultSettings)
      updateStudySettings(defaultSettings)
      toast.success('Settings reset to default')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your learning experience
          </p>
        </div>
        <SettingsIcon className="h-8 w-8 text-gray-400" />
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Moon className="h-5 w-5 mr-2" />
              Appearance
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark theme
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
                <span className="sr-only">Toggle dark mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Study Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Study Settings
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Daily Goal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={settings.dailyGoal}
                  onChange={(e) => handleSettingChange('dailyGoal', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono font-medium w-12">{settings.dailyGoal}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Enable Hints</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show hints during study
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('showHints', !settings.showHints)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.showHints ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.showHints ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Auto-play Audio</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically pronounce words
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('autoPlayAudio', !settings.autoPlayAudio)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.autoPlayAudio ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.autoPlayAudio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Study reminders
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('enableNotifications', !settings.enableNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.enableNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable keyboard navigation
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('keyboardShortcuts', !settings.keyboardShortcuts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    settings.keyboardShortcuts ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.keyboardShortcuts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Study Mode
              </label>
              <select
                value={settings.defaultMode}
                onChange={(e) => handleSettingChange('defaultMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="flashcard">Flashcards</option>
                <option value="quiz">Quiz</option>
                <option value="typing">Typing Practice</option>
                <option value="matching">Matching Game</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Data Management
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Storage Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {storageStats.totalSize}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Storage Used</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {storageStats.wordsCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Words</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {storageStats.sessionsCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Sessions</div>
              </div>
            </div>

            {/* Data Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleExportData}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="h-8 w-8 text-primary-600 dark:text-primary-400 mb-2" />
                <span className="font-medium">Export Data</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Download backup</span>
              </button>

              <label className="flex flex-col items-center justify-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="font-medium">Import Data</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Restore backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleClearData}
                className="flex flex-col items-center justify-center p-4 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400 mb-2" />
                <span className="font-medium">Clear All Data</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Reset everything</span>
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Advanced
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Auto Save</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically save changes
                </p>
              </div>
              <button
                onClick={() => handleSettingChange('autoSave', !settings.autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.autoSave ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Data Backup</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create automatic backups
                </p>
              </div>
              <button
                onClick={() => handleSettingChange('dataBackup', !settings.dataBackup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.dataBackup ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.dataBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reset Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Reset All Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This will reset all settings to their default values
              </p>
              <button
                onClick={handleResetSettings}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
