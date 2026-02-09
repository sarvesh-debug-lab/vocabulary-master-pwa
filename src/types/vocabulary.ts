// src/types/vocabulary.ts
export interface VocabularyWord {
  // Basic word information
  id: string
  word: string
  definition: string
  translation?: string
  phonetic?: string
  audioUrl?: string
  
  // Categorization
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'master'
  category?: string
  tags?: string[]
  customTags?: string[]
  
  // Examples and context
  examples: string[]
  synonyms?: string[]
  antonyms?: string[]
  usageNotes?: string[]
  
  // Spaced repetition data
  interval: number // Days until next review
  easeFactor: number // Ease factor for SM-2 algorithm
  reviewCount: number // Number of times reviewed
  masteryScore: number // 0-100
  
  // Timestamps
  nextReviewAt: string // ISO date string
  lastReviewedAt: string // ISO date string
  createdAt: string // ISO date string
  modifiedAt?: string // ISO date string
  
  // User data
  personalNote?: string
  favorite?: boolean
  difficultyOverride?: number // 1-10, user's personal difficulty rating
  confidenceLevel?: number // 1-10, user's confidence
}

export interface CardStats {
  reviewCount: number
  correctCount: number
  incorrectCount: number
  averageResponseTime: number
  streak: number
  lastFiveReviews: Array<{
    date: string
    quality: number
    responseTime: number
  }>
}

export interface WordGroup {
  id: string
  name: string
  description?: string
  wordIds: string[]
  tags?: string[]
  difficulty?: string
  createdAt: string
  modifiedAt?: string
}

export interface WordImportResult {
  success: boolean
  imported: number
  skipped: number
  duplicates: number
  errors: Array<{
    word: string
    error: string
  }>
}

export interface WordFilterOptions {
  difficulty?: string | string[]
  category?: string | string[]
  tags?: string[]
  mastered?: boolean
  dueForReview?: boolean
  favorite?: boolean
  search?: string
  dateRange?: {
    start: string
    end: string
  }
  sortBy?: 'word' | 'difficulty' | 'masteryScore' | 'nextReviewAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface WordListStats {
  totalWords: number
  mastered: number
  dueForReview: number
  byDifficulty: {
    beginner: number
    intermediate: number
    advanced: number
    master: number
  }
  byCategory: Record<string, number>
  averageMastery: number
}
