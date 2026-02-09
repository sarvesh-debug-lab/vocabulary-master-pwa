// src/types/study.ts
export interface StudySession {
  id: string
  userId?: string
  startTime: string
  endTime?: string
  duration: number // in milliseconds
  cardsReviewed: number
  correctAnswers: number
  incorrectAnswers: number
  averageResponseTime: number
  accuracy: number // 0-100
  streak: number
  mode: 'review' | 'learn' | 'test' | 'custom'
  deckId?: string
  tags?: string[]
  difficultyBreakdown?: Record<string, number>
  sessionNotes?: string
  interrupted?: boolean
  deviceInfo?: {
    platform: string
    browser?: string
    screenSize?: string
  }
}

export interface StudyAnswer {
  wordId: string
  sessionId: string
  quality: 0 | 1 | 2 | 3 | 4 | 5
  responseTime: number // milliseconds
  isCorrect: boolean
  attemptNumber: number // For multi-attempt questions
  answeredAt: string
  difficultyLevel: number // 1-10
  cardSide: 'front' | 'back' // Which side was shown
  userConfidence?: number // 1-10
  feedback?: string // User's feedback on difficulty
}

export interface StudyDeck {
  id: string
  name: string
  description?: string
  wordIds: string[]
  tags?: string[]
  difficulty: 'mixed' | 'beginner' | 'intermediate' | 'advanced' | 'master'
  isCustom: boolean
  createdAt: string
  modifiedAt?: string
  settings?: StudyDeckSettings
  stats?: StudyDeckStats
}

export interface StudyDeckSettings {
  order: 'random' | 'difficulty' | 'mastery' | 'dueDate'
  showPhonetic: boolean
  showTranslation: boolean
  showExamples: boolean
  autoPlayAudio: boolean
  timeLimitPerCard?: number // seconds, null for no limit
  maxCardsPerSession?: number
  requireTyping?: boolean
  enableHints?: boolean
  difficultyAdjustment: boolean
}

export interface StudyDeckStats {
  totalReviews: number
  averageAccuracy: number
  averageTimePerCard: number
  lastStudied?: string
  masteryProgress: number // 0-100
  hardestWords: string[]
}

export interface StudyGoal {
  id: string
  name: string
  description?: string
  target: number // Target number of cards/reviews
  current: number
  unit: 'cards' | 'reviews' | 'sessions' | 'minutes'
  period: 'daily' | 'weekly' | 'monthly' | 'custom'
  startDate: string
  endDate?: string
  isActive: boolean
  achievedAt?: string
  streak: number
  difficulty?: string
  tags?: string[]
}

export interface StudyPreferences {
  dailyGoal: number
  reviewReminders: boolean
  reminderTime?: string // "HH:MM"
  soundEnabled: boolean
  vibrationEnabled: boolean
  autoAdvance: boolean // Automatically advance to next card
  showProgressBar: boolean
  darkMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: string
  language: string
  studyMode: 'balanced' | 'aggressive' | 'relaxed'
  focusMode: boolean
}

export interface StudyPlan {
  id: string
  name: string
  description?: string
  decks: string[]
  schedule: StudySchedule[]
  goals: StudyGoal[]
  isActive: boolean
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface StudySchedule {
  day: number // 0-6 (Sunday-Saturday)
  timeSlots: Array<{
    startTime: string // "HH:MM"
    duration: number // minutes
    deckId?: string
  }>
  targetCards: number
}

export interface PerformanceMetrics {
  wordId: string
  totalReviews: number
  correctReviews: number
  incorrectReviews: number
  averageQuality: number
  averageResponseTime: number
  lastReviewed: string
  nextReview: string
  retentionRate: number // 0-100
  difficultyScore: number // 1-10
  confidenceTrend: number[] // Last 10 confidence scores
  }
