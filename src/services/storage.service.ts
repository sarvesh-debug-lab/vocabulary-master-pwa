// src/services/storage.service.ts
import { z } from 'zod'
import type { VocabularyWord, StudySession, AppSettings } from '@/types'

// Constants
const STORAGE_KEYS = {
  WORDS: 'vocabulary-master_words_v1',
  SESSIONS: 'vocabulary-master_sessions_v1',
  SETTINGS: 'vocabulary-master_settings_v1',
  META: 'vocabulary-master_meta_v1'
} as const

const STORAGE_VERSION = 1
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB
const DEBOUNCE_DELAY = 500 // ms

// Schema validation
const VocabularyWordSchema = z.object({
  id: z.string().uuid(),
  word: z.string().min(1).max(100),
  phonetic: z.string().optional(),
  meaning: z.string().min(1),
  definitions: z.array(z.string()),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'master']),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastReviewedAt: z.string().datetime().optional(),
  reviewCount: z.number().int().min(0),
  nextReviewAt: z.string().datetime(),
  interval: z.number().min(0),
  easeFactor: z.number().min(1.3).max(2.5),
  masteryScore: z.number().min(0).max(100),
  isStarred: z.boolean(),
  isArchived: z.boolean()
})

const StudySessionSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(['flashcard', 'quiz', 'typing', 'matching']),
  duration: z.number().min(0),
  totalCards: z.number().min(0),
  correctAnswers: z.number().min(0),
  accuracy: z.number().min(0).max(1),
  completedAt: z.string().datetime(),
  wordIds: z.array(z.string().uuid())
})

const AppSettingsSchema = z.object({
  version: z.number(),
  darkMode: z.boolean(),
  dailyGoal: z.number().min(1).max(100),
  enableNotifications: z.boolean(),
  autoPlayAudio: z.boolean(),
  defaultMode: z.enum(['flashcard', 'quiz', 'typing', 'matching']),
  showHints: z.boolean(),
  difficultyFilter: z.array(z.enum(['beginner', 'intermediate', 'advanced', 'master'])),
  tagsFilter: z.array(z.string()),
  lastSyncAt: z.string().datetime().optional(),
  streak: z.number().min(0)
})

export class StorageService {
  private static instance: StorageService
  private cache = new Map<string, any>()
  private writeQueue = new Map<string, any>()
  private writeTimeout: ReturnType<typeof setTimeout> | null = null

  private constructor() {
    this.initializeStorage()
    this.setupCrossTabSync()
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  // ==================== INITIALIZATION ====================
  
  private initializeStorage(): void {
    try {
      // Check if storage is available
      if (!this.isLocalStorageAvailable()) {
        throw new Error('LocalStorage is not available')
      }

      // Initialize meta data
      const meta = this.getMetaData()
      if (meta.version !== STORAGE_VERSION) {
        this.migrateData(meta.version)
      }

      // Initialize default data if empty
      if (!this.getRaw(STORAGE_KEYS.WORDS)) {
        this.setRaw(STORAGE_KEYS.WORDS, [])
      }

      if (!this.getRaw(STORAGE_KEYS.SESSIONS)) {
        this.setRaw(STORAGE_KEYS.SESSIONS, [])
      }

      if (!this.getRaw(STORAGE_KEYS.SETTINGS)) {
        this.setRaw(STORAGE_KEYS.SETTINGS, {
          version: STORAGE_VERSION,
          darkMode: false,
          dailyGoal: 20,
          enableNotifications: true,
          autoPlayAudio: false,
          defaultMode: 'flashcard',
          showHints: true,
          difficultyFilter: ['beginner', 'intermediate', 'advanced'],
          tagsFilter: [],
          streak: 0
        })
      }

      // Check storage health
      this.checkStorageHealth()
    } catch (error) {
      console.error('Failed to initialize storage:', error)
      this.recoverFromCorruption()
    }
  }

  private setupCrossTabSync(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (Object.values(STORAGE_KEYS).includes(event.key as any)) {
          // Invalidate cache for this key
          this.cache.delete(event.key!)
          
          // Notify listeners
          this.notifyChange(event.key!)
        }
      })
    }
  }

  private notifyChange(key: string): void {
    // You can implement custom event dispatching here
    // For example, using a custom event or callback system
    const event = new CustomEvent('storageUpdated', { 
      detail: { key, timestamp: Date.now() } 
    })
    window.dispatchEvent(event)
  }

  // ==================== PUBLIC API ====================

  // Words CRUD Operations
  getAllWords(): VocabularyWord[] {
    return this.getWithValidation(STORAGE_KEYS.WORDS, VocabularyWordSchema.array(), [])
  }

  getWordById(id: string): VocabularyWord | null {
    const words = this.getAllWords()
    return words.find(word => word.id === id) || null
  }

  getWordsBy(filter: {
    difficulty?: string[]
    tags?: string[]
    isArchived?: boolean
    isStarred?: boolean
    searchQuery?: string
    minMastery?: number
    maxMastery?: number
  } = {}): VocabularyWord[] {
    const words = this.getAllWords()
    
    return words.filter(word => {
      // Filter by archived status
      if (filter.isArchived !== undefined && word.isArchived !== filter.isArchived) {
        return false
      }

      // Filter by starred status
      if (filter.isStarred !== undefined && word.isStarred !== filter.isStarred) {
        return false
      }

      // Filter by difficulty
      if (filter.difficulty?.length && !filter.difficulty.includes(word.difficulty)) {
        return false
      }

      // Filter by tags
      if (filter.tags?.length && !word.tags.some(tag => filter.tags!.includes(tag))) {
        return false
      }

      // Filter by mastery range
      if (filter.minMastery !== undefined && word.masteryScore < filter.minMastery) {
        return false
      }

      if (filter.maxMastery !== undefined && word.masteryScore > filter.maxMastery) {
        return false
      }

      // Filter by search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase()
        const matches = 
          word.word.toLowerCase().includes(query) ||
          word.meaning.toLowerCase().includes(query) ||
          word.definitions.some(def => def.toLowerCase().includes(query)) ||
          word.tags.some(tag => tag.toLowerCase().includes(query))
        
        if (!matches) return false
      }

      return true
    })
  }

  getWordsDueForReview(limit: number = 100): VocabularyWord[] {
    const words = this.getAllWords()
    const now = new Date().toISOString()
    
    return words
      .filter(word => !word.isArchived && word.nextReviewAt <= now)
      .sort((a, b) => {
        // Sort by priority: overdue first, then by mastery (lowest first)
        const aOverdue = new Date(a.nextReviewAt).getTime() - new Date().getTime()
        const bOverdue = new Date(b.nextReviewAt).getTime() - new Date().getTime()
        
        if (aOverdue < 0 && bOverdue >= 0) return -1
        if (bOverdue < 0 && aOverdue >= 0) return 1
        
        return a.masteryScore - b.masteryScore
      })
      .slice(0, limit)
  }

  addWord(wordData: Omit<VocabularyWord, 'id' | 'createdAt' | 'updatedAt'>): string {
    const newWord: VocabularyWord = {
      ...wordData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Validate the word
    const result = VocabularyWordSchema.safeParse(newWord)
    if (!result.success) {
      throw new Error(`Invalid word data: ${result.error.message}`)
    }

    const words = this.getAllWords()
    
    // Check for duplicates (case-insensitive, ignoring spaces)
    const normalizedWord = newWord.word.toLowerCase().trim()
    const exists = words.some(w => 
      w.word.toLowerCase().trim() === normalizedWord && !w.isArchived
    )
    
    if (exists) {
      throw new Error('Word already exists in your vocabulary')
    }

    words.push(newWord)
    this.setWords(words)
    
    return newWord.id
  }

  updateWord(id: string, updates: Partial<VocabularyWord>): void {
    const words = this.getAllWords()
    const index = words.findIndex(w => w.id === id)
    
    if (index === -1) {
      throw new Error('Word not found')
    }

    const updatedWord = {
      ...words[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    // Validate the updated word
    const result = VocabularyWordSchema.safeParse(updatedWord)
    if (!result.success) {
      throw new Error(`Invalid word data: ${result.error.message}`)
    }

    words[index] = updatedWord
    this.setWords(words)
  }

  deleteWord(id: string): void {
    const words = this.getAllWords()
    const filteredWords = words.filter(w => w.id !== id)
    
    if (filteredWords.length === words.length) {
      throw new Error('Word not found')
    }

    this.setWords(filteredWords)
  }

  // Sessions CRUD Operations
  getAllSessions(limit?: number): StudySession[] {
    const sessions = this.getWithValidation(STORAGE_KEYS.SESSIONS, StudySessionSchema.array(), [])
    return limit ? sessions.slice(0, limit) : sessions
  }

  addSession(session: Omit<StudySession, 'id'>): string {
    const newSession: StudySession = {
      ...session,
      id: crypto.randomUUID()
    }

    const result = StudySessionSchema.safeParse(newSession)
    if (!result.success) {
      throw new Error(`Invalid session data: ${result.error.message}`)
    }

    const sessions = this.getAllSessions()
    sessions.unshift(newSession)
    
    // Keep only recent sessions for performance
    const trimmedSessions = sessions.slice(0, 100)
    this.setRaw(STORAGE_KEYS.SESSIONS, trimmedSessions)
    
    return newSession.id
  }

  // Settings Operations
  getSettings(): AppSettings {
    return this.getWithValidation(STORAGE_KEYS.SETTINGS, AppSettingsSchema, {
      version: STORAGE_VERSION,
      darkMode: false,
      dailyGoal: 20,
      enableNotifications: true,
      autoPlayAudio: false,
      defaultMode: 'flashcard',
      showHints: true,
      difficultyFilter: ['beginner', 'intermediate', 'advanced'],
      tagsFilter: [],
      streak: 0
    })
  }

  updateSettings(updates: Partial<AppSettings>): void {
    const settings = this.getSettings()
    const updatedSettings = { ...settings, ...updates }
    
    // Validate updated settings
    const result = AppSettingsSchema.safeParse(updatedSettings)
    if (!result.success) {
      throw new Error(`Invalid settings data: ${result.error.message}`)
    }
    
    this.setRaw(STORAGE_KEYS.SETTINGS, updatedSettings)
  }

  // ==================== UTILITY METHODS ====================

  private getWithValidation<T>(key: string, schema: z.ZodSchema<T>, defaultValue: T): T {
    try {
      const raw = this.getRaw(key)
      if (!raw) return defaultValue
      
      const result = schema.safeParse(raw)
      if (!result.success) {
        console.warn(`Invalid data format for ${key}:`, result.error.format())
        this.handleCorruption(key, defaultValue)
        return defaultValue
      }
      
      return result.data
    } catch (error) {
      console.error(`Failed to get ${key}:`, error)
      return defaultValue
    }
  }

  private getRaw(key: string): any {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const parsed = JSON.parse(item)
      this.cache.set(key, parsed)
      return parsed
    } catch (error) {
      console.error(`Failed to parse ${key}:`, error)
      this.handleCorruption(key, null)
      return null
    }
  }

  private setRaw(key: string, value: any): void {
    try {
      // Queue the write for debouncing
      this.writeQueue.set(key, value)
      this.scheduleWrite()
      
      // Update cache immediately for synchronous reads
      this.cache.set(key, value)
    } catch (error) {
      console.error(`Failed to set ${key}:`, error)
      this.checkStorageSize()
    }
  }

  private setWords(words: VocabularyWord[]): void {
    this.setRaw(STORAGE_KEYS.WORDS, words)
  }

  private scheduleWrite(): void {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout)
    }

    this.writeTimeout = setTimeout(() => {
      this.flushWriteQueue()
    }, DEBOUNCE_DELAY)
  }

  private flushWriteQueue(): void {
    try {
      this.writeQueue.forEach((value, key) => {
        localStorage.setItem(key, JSON.stringify(value))
      })
      this.writeQueue.clear()
    } catch (error) {
      console.error('Failed to write to localStorage:', error)
      this.checkStorageSize()
    }
  }

  // ==================== MIGRATION & RECOVERY ====================

  private getMetaData(): { version: number; lastMigration?: string } {
    try {
      const meta = this.getRaw(STORAGE_KEYS.META)
      return meta || { version: 1 }
    } catch (error) {
      return { version: 1 }
    }
  }

  private migrateData(oldVersion: number): void {
    console.log(`Migrating data from version ${oldVersion} to ${STORAGE_VERSION}`)
    
    // Currently only one version, but structure is ready for future migrations
    if (oldVersion < STORAGE_VERSION) {
      // Example: Migrate from version 1 to 2
      // const oldWords = this.getRaw('vocabulary-master_words_v1')
      // if (oldWords && Array.isArray(oldWords)) {
      //   const migratedWords = oldWords.map((word: any) => ({
      //     ...word,
      //     newField: 'defaultValue'
      //   }))
      //   this.setRaw(STORAGE_KEYS.WORDS, migratedWords)
      // }
    }

    // Update meta version
    this.setRaw(STORAGE_KEYS.META, {
      version: STORAGE_VERSION,
      lastMigration: new Date().toISOString()
    })
  }

  // ==================== SAFETY & RECOVERY ====================

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch (error) {
      return false
    }
  }

  private checkStorageHealth(): void {
    this.checkStorageSize()
    this.validateAllData()
  }

  private checkStorageSize(): void {
    try {
      let totalSize = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('vocabulary-master_')) {
          const value = localStorage.getItem(key)
          totalSize += (key.length + (value?.length || 0)) * 2 // UTF-16
        }
      }

      const usedPercentage = (totalSize / MAX_STORAGE_SIZE) * 100
      
      if (usedPercentage > 90) {
        console.error('Storage almost full!')
        this.cleanupOldData()
      } else if (usedPercentage > 70) {
        console.warn(`Storage usage is high: ${Math.round(usedPercentage)}%`)
      }
    } catch (error) {
      console.error('Failed to check storage size:', error)
    }
  }

  private cleanupOldData(): void {
    try {
      // Clean up old sessions (keep only last 50)
      const sessions = this.getAllSessions()
      if (sessions.length > 50) {
        this.setRaw(STORAGE_KEYS.SESSIONS, sessions.slice(0, 50))
      }

      // Archive old completed words with high mastery
      const words = this.getAllWords()
      const now = new Date()
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6))
      
      const wordsToArchive = words.filter(word => 
        !word.isArchived && 
        word.masteryScore >= 90 && 
        word.lastReviewedAt && 
        new Date(word.lastReviewedAt) < sixMonthsAgo
      )
      
      if (wordsToArchive.length > 0) {
        wordsToArchive.forEach(word => {
          this.updateWord(word.id, { isArchived: true })
        })
        console.log(`Archived ${wordsToArchive.length} old mastered words`)
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
    }
  }

  private validateAllData(): void {
    try {
      // Validate all stored data
      this.getAllWords()
      this.getAllSessions()
      this.getSettings()
    } catch (error) {
      console.warn('Data validation found issues:', error)
    }
  }

  private handleCorruption(key: string, defaultValue: any): void {
    console.warn(`Handling corrupted data for key: ${key}`)
    
    try {
      // Try to backup corrupted data before overwriting
      const corrupted = localStorage.getItem(key)
      if (corrupted) {
        const backupKey = `${key}_corrupted_backup_${Date.now()}`
        localStorage.setItem(backupKey, corrupted)
        console.log(`Backed up corrupted data to: ${backupKey}`)
      }
      
      // Set default value
      localStorage.setItem(key, JSON.stringify(defaultValue))
      this.cache.delete(key)
      
      console.log(`Restored ${key} to default value`)
    } catch (error) {
      console.error('Failed to handle corruption:', error)
    }
  }

  private recoverFromCorruption(): void {
    console.log('Attempting to recover from storage corruption...')
    
    try {
      // Clear only app data
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      this.cache.clear()
      this.writeQueue.clear()
      
      if (this.writeTimeout) {
        clearTimeout(this.writeTimeout)
      }
      
      // Reinitialize
      this.initializeStorage()
      console.log('Recovery successful')
    } catch (error) {
      console.error('Recovery failed:', error)
      throw new Error('Storage corruption recovery failed. Please refresh the app.')
    }
  }

  // ==================== BULK OPERATIONS ====================

  exportData(): string {
    const data = {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'Vocabulary Master',
      data: {
        words: this.getAllWords(),
        sessions: this.getAllSessions(),
        settings: this.getSettings()
      }
    }

    return JSON.stringify(data, null, 2)
  }

  importData(jsonString: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonString)
      const errors: string[] = []

      // Validate import data structure
      if (!data.data || !data.data.words || !Array.isArray(data.data.words)) {
        throw new Error('Invalid import data format')
      }

      // Import words
      const validWords: VocabularyWord[] = []
      
      data.data.words.forEach((word: any, index: number) => {
        try {
          // Ensure required fields exist
          const validatedWord = VocabularyWordSchema.parse({
            ...word,
            id: word.id || crypto.randomUUID(),
            createdAt: word.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Set default values for missing optional fields
            phonetic: word.phonetic || '',
            definitions: word.definitions || [word.meaning],
            examples: word.examples || [],
            synonyms: word.synonyms || [],
            antonyms: word.antonyms || [],
            tags: word.tags || [],
            notes: word.notes || '',
            imageUrl: word.imageUrl || '',
            audioUrl: word.audioUrl || '',
            lastReviewedAt: word.lastReviewedAt || null,
            reviewCount: word.reviewCount || 0,
            interval: word.interval || 0,
            easeFactor: word.easeFactor || 2.5,
            masteryScore: word.masteryScore || 0,
            nextReviewAt: word.nextReviewAt || new Date().toISOString(),
            isStarred: word.isStarred || false,
            isArchived: word.isArchived || false
          })
          validWords.push(validatedWord)
        } catch (error) {
          errors.push(`Word ${index + 1}: ${error instanceof Error ? error.message : 'Invalid format'}`)
        }
      })

      // Import sessions if valid
      if (Array.isArray(data.data.sessions)) {
        const validSessions: StudySession[] = []
        
        data.data.sessions.forEach((session: any, index: number) => {
          try {
            const validatedSession = StudySessionSchema.parse(session)
            validSessions.push(validatedSession)
          } catch (error) {
            errors.push(`Session ${index + 1}: ${error instanceof Error ? error.message : 'Invalid format'}`)
          }
        })

        if (validSessions.length > 0) {
          this.setRaw(STORAGE_KEYS.SESSIONS, validSessions.slice(0, 100))
        }
      }

      // Import settings if valid
      if (data.data.settings) {
        try {
          const validatedSettings = AppSettingsSchema.parse(data.data.settings)
          this.setRaw(STORAGE_KEYS.SETTINGS, validatedSettings)
        } catch (error) {
          errors.push(`Settings: ${error instanceof Error ? error.message : 'Invalid format'}`)
        }
      }

      // Replace words with imported ones
      this.setWords(validWords)

      return {
        success: errors.length === 0,
        imported: validWords.length,
        errors
      }
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Invalid JSON format'}`)
    }
  }

  clearAppData(): void {
    try {
      // Clear only app-specific data
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      
      // Clear cache
      this.cache.clear()
      this.writeQueue.clear()
      
      // Clear timeout
      if (this.writeTimeout) {
        clearTimeout(this.writeTimeout)
      }
      
      // Reinitialize with defaults
      this.initializeStorage()
    } catch (error) {
      console.error('Failed to clear app data:', error)
      throw error
    }
  }

  // ==================== STATISTICS ====================

  getStats(): {
    totalWords: number
    activeWords: number
    archivedWords: number
    starredWords: number
    dueForReview: number
    totalSessions: number
    totalReviews: number
    averageMastery: number
    storageUsage: string
  } {
    const words = this.getAllWords()
    const sessions = this.getAllSessions()
    
    const totalWords = words.length
    const activeWords = words.filter(w => !w.isArchived).length
    const archivedWords = words.filter(w => w.isArchived).length
    const starredWords = words.filter(w => w.isStarred).length
    const dueForReview = words.filter(w => 
      !w.isArchived && new Date(w.nextReviewAt) <= new Date()
    ).length
    
    const totalSessions = sessions.length
    const totalReviews = sessions.reduce((sum, session) => sum + session.totalCards, 0)
    
    const averageMastery = totalWords > 0 
      ? Math.round(words.reduce((sum, word) => sum + word.masteryScore, 0) / totalWords)
      : 0

    // Calculate storage usage
    let storageUsage = '0KB'
    try {
      const data = this.exportData()
      storageUsage = `${Math.round(data.length / 1024)}KB`
    } catch (error) {
      // Ignore calculation errors
    }

    return {
      totalWords,
      activeWords,
      archivedWords,
      starredWords,
      dueForReview,
      totalSessions,
      totalReviews,
      averageMastery,
      storageUsage
    }
  }

  // ==================== CLEANUP ====================

  forceSave(): void {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout)
    }
    this.flushWriteQueue()
  }

  destroy(): void {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout)
    }
    this.forceSave()
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', () => {})
    }
  }
}

export const storage = StorageService.getInstance()
