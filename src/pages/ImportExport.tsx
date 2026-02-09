// src/pages/ImportExport.tsx
import { useState } from 'react'
import { 
  Download, Upload, Trash2, FileText, FileJson, 
  CheckCircle, AlertCircle, Database, Shield,
  Copy, ExternalLink, RefreshCw, History
} from 'lucide-react'
import { storage } from '@/services/storage.service'
import { toast } from 'react-hot-toast'
import Papa from 'papaparse'

export default function ImportExport() {
  const [importType, setImportType] = useState<'json' | 'csv'>('json')
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    errors: string[]
  } | null>(null)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [isExporting, setIsExporting] = useState(false)
  const [backupHistory, setBackupHistory] = useState<any[]>([])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      if (exportFormat === 'json') {
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
        
        // Add to backup history
        setBackupHistory(prev => [{
          type: 'json',
          date: new Date().toISOString(),
          size: Math.round(blob.size / 1024)
        }, ...prev.slice(0, 4)])
        
        toast.success('Data exported as JSON successfully')
      } else {
        // Export as CSV
        const words = storage.getAllWords()
        const csvData = words.map(word => ({
          word: word.word,
          meaning: word.meaning,
          example: word.examples[0] || '',
          synonyms: word.synonyms.join(';'),
          antonyms: word.antonyms.join(';'),
          tags: word.tags.join(';'),
          difficulty: word.difficulty,
          notes: word.notes || '',
          mastery: word.masteryScore,
          reviews: word.reviewCount,
          next_review: word.nextReviewAt,
          created: word.createdAt
        }))
        
        const csv = Papa.unparse(csvData)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vocabulary-master-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        // Add to backup history
        setBackupHistory(prev => [{
          type: 'csv',
          date: new Date().toISOString(),
          size: Math.round(blob.size / 1024)
        }, ...prev.slice(0, 4)])
        
        toast.success('Data exported as CSV successfully')
      }
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!window.confirm('Importing will replace your current vocabulary. Continue?')) {
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()
      let result
      
      if (importType === 'json') {
        result = storage.importData(text)
      } else {
        // Handle CSV import
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true
        })
        
        const words = parsed.data.map((row: any) => ({
          word: row.word || row.Word || '',
          meaning: row.meaning || row.Meaning || row.Definition || '',
          definitions: [row.meaning || row.Meaning || row.Definition || ''],
          examples: row.example ? [row.example] : [],
          synonyms: row.synonyms ? row.synonyms.split(';').filter((s: string) => s.trim()) : [],
          antonyms: row.antonyms ? row.antonyms.split(';').filter((a: string) => a.trim()) : [],
          tags: row.tags ? row.tags.split(';').filter((t: string) => t.trim()) : [],
          difficulty: (row.difficulty || 'intermediate').toLowerCase(),
          notes: row.notes || '',
          imageUrl: '',
          audioUrl: '',
          reviewCount: parseInt(row.reviews) || 0,
          interval: 0,
          easeFactor: 2.5,
          masteryScore: parseInt(row.mastery) || 0,
          nextReviewAt: row.next_review || new Date().toISOString(),
          isStarred: false,
          isArchived: false
        }))
        
        // Filter out invalid words
        const validWords = words.filter((w: any) => w.word && w.meaning)
        
        // Clear existing data and import new
        storage.clearAppData()
        for (const word of validWords) {
          try {
            await storage.addWord(word)
          } catch (error) {
            // Skip duplicates
          }
        }
        
        result = {
          success: true,
          imported: validWords.length,
          errors: []
        }
      }
      
      setImportResult(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} words`)
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import data')
      setImportResult({
        success: false,
        imported: 0,
        errors: [error.message || 'Import failed']
      })
    }
    
    // Reset file input
    event.target.value = ''
  }

  const handleCopyToClipboard = async () => {
    try {
      const data = storage.exportData()
      await navigator.clipboard.writeText(data)
      toast.success('Data copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone!')) {
      try {
        storage.clearAppData()
        toast.success('All data cleared successfully')
        setImportResult(null)
      } catch (error) {
        toast.error('Failed to clear data')
      }
    }
  }

  const getStats = () => {
    const words = storage.getAllWords()
    const sessions = storage.getAllSessions()
    
    return {
      totalWords: words.length,
      totalSessions: sessions.length,
      storageUsed: Math.round(JSON.stringify(words).length / 1024) + 'KB'
    }
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Import, export, and manage your vocabulary data
          </p>
        </div>
        <Database className="h-8 w-8 text-gray-400" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalWords}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Words</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalSessions}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Sessions</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.storageUsed}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Storage</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Export Data
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('json')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                    exportFormat === 'json'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <FileJson className="h-8 w-8 mb-2" />
                  <span className="font-medium">JSON</span>
                  <span className="text-sm text-gray-500">Full data backup</span>
                </button>
                
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                    exportFormat === 'csv'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <FileText className="h-8 w-8 mb-2" />
                  <span className="font-medium">CSV</span>
                  <span className="text-sm text-gray-500">Spreadsheet format</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export Data ({exportFormat.toUpperCase()})
                  </>
                )}
              </button>
              
              <button
                onClick={handleCopyToClipboard}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy to Clipboard
              </button>
            </div>

            {/* Export Tips */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Export Tips
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• JSON preserves all data including study sessions</li>
                <li>• CSV is compatible with spreadsheet software</li>
                <li>• Regular backups ensure data safety</li>
                <li>• Copy to clipboard for quick sharing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Import Data
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Import Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setImportType('json')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                    importType === 'json'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <FileJson className="h-8 w-8 mb-2" />
                  <span className="font-medium">JSON</span>
                  <span className="text-sm text-gray-500">Vocabulary Master backup</span>
                </button>
                
                <button
                  onClick={() => setImportType('csv')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                    importType === 'csv'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <FileText className="h-8 w-8 mb-2" />
                  <span className="font-medium">CSV</span>
                  <span className="text-sm text-gray-500">Spreadsheet data</span>
                </button>
              </div>
            </div>

            <div>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <span className="font-medium">Select {importType.toUpperCase()} file</span>
                <span className="text-sm text-gray-500">or drag and drop</span>
                <input
                  type="file"
                  accept={importType === 'json' ? '.json' : '.csv,.txt'}
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg ${
                importResult.success
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-start">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-medium">
                      {importResult.success ? 'Import Successful' : 'Import Completed with Errors'}
                    </h4>
                    <p className="text-sm mt-1">
                      {importResult.success 
                        ? `Successfully imported ${importResult.imported} words`
                        : `Imported ${importResult.imported} words with ${importResult.errors.length} errors`}
                    </p>
                    
                    {importResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer">Show errors</summary>
                        <ul className="text-xs mt-2 space-y-1">
                          {importResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                          {importResult.errors.length > 5 && (
                            <li>...and {importResult.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Warning */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Important Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Importing data will replace your current vocabulary collection. 
                Make sure to export a backup first if you want to keep your existing data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-red-200 dark:border-red-800">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center justify-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Danger Zone
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete all your vocabulary data
            </p>
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <History className="h-5 w-5 mr-2" />
              Recent Backups
            </h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    {backup.type === 'json' ? (
                      <FileJson className="h-5 w-5 text-blue-500 mr-3" />
                    ) : (
                      <FileText className="h-5 w-5 text-green-500 mr-3" />
                    )}
                    <div>
                      <div className="font-medium">
                        {backup.type.toUpperCase()} Backup
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(backup.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {backup.size}KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
