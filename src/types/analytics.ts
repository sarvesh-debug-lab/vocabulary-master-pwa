// src/types/analytics.ts
export interface AnalyticsOverview {
  totalStudyTime: number // in minutes
  totalSessions: number
  totalCardsReviewed: number
  averageAccuracy: number // 0-100
  currentStreak: number
  longestStreak: number
  daysActive: number
  averageDailyCards: number
  masteryProgress: number // 0-100
  recentActivity: DailyActivity[]
}

export interface DailyActivity {
  date: string
  cardsReviewed: number
  studyTime: number
  accuracy: number
  sessions: number
  newWords: number
  masteredWords: number
}

export interface PerformanceTrend {
  period: '7d' | '30d' | '90d' | '1y'
  labels: string[]
  accuracy: number[]
  cardsReviewed: number[]
  studyTime: number[]
  newWords: number[]
  masteredWords: number[]
}

export interface DifficultyAnalytics {
  beginner: DifficultyStats
  intermediate: DifficultyStats
  advanced: DifficultyStats
  master: DifficultyStats
}

export interface DifficultyStats {
  totalWords: number
  mastered: number
  averageReviewsToMaster: number
  averageAccuracy: number
  averageResponseTime: number
  hardestWords: string[]
  easiestWords: string[]
}

export interface RetentionAnalytics {
  oneDay: number // 0-100
  sevenDays: number // 0-100
  thirtyDays: number // 0-100
  ninetyDays: number // 0-100
  byDifficulty: Record<string, number>
  byTimeOfDay: Record<string, number>
}

export interface StudyPattern {
  preferredTimeOfDay: string
  averageSessionDuration: number
  averageCardsPerSession: number
  preferredDays: number[] // 0-6 (Sunday-Saturday)
  studyFrequency: 'daily' | 'weekly' | 'irregular'
  bestAccuracyTime: string
  mostProductiveDay: string
}

export interface WordRetention {
  wordId: string
  word: string
  difficulty: string
  retentionScore: number // 0-100
  reviews: number
  lastReviewed: string
  nextReview: string
  difficultyTrend: number[] // User's difficulty ratings over time
}

export interface HeatmapData {
  date: string
  count: number
  intensity: number // 0-1
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'study' | 'mastery' | 'consistency' | 'speed' | 'milestone'
  requirement: {
    type: string
    target: number
    current: number
  }
  unlocked: boolean
  unlockedAt?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  points: number
}

export interface ProgressReport {
  period: {
    start: string
    end: string
  }
  overview: AnalyticsOverview
  trends: PerformanceTrend
  patterns: StudyPattern
  achievements: Achievement[]
  recommendations: Recommendation[]
  areasForImprovement: string[]
}

export interface Recommendation {
  type: 'study' | 'review' | 'break' | 'goal' | 'deck'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action?: string
  data?: any
}

export interface AnalyticsExport {
  version: string
  exportDate: string
  overview: AnalyticsOverview
  dailyActivity: DailyActivity[]
  performanceTrends: PerformanceTrend[]
  difficultyAnalytics: DifficultyAnalytics
  retentionAnalytics: RetentionAnalytics
  studyPatterns: StudyPattern
  achievements: Achievement[]
  wordRetention: WordRetention[]
}
