// src/utils/helpers.ts
import { VocabularyWord, WordFilterOptions } from '@/types'
import { SpacedRepetitionService } from '@/services/spacedRepetition'

/**
 * Utility functions for the vocabulary learning application
 */
export class Helpers {
  /**
   * Format a date to relative time (e.g., "2 hours ago", "3 days ago")
   */
  static formatRelativeTime(date: Date | string): string {
    const now = new Date()
    const target = new Date(date)
    const diffInMs = now.getTime() - target.getTime()
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day
    
    if (diffInMs < minute) {
      return 'just now'
    } else if (diffInMs < hour) {
      const minutes = Math.floor(diffInMs / minute)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInMs < day) {
      const hours = Math.floor(diffInMs / hour)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInMs < week) {
      const days = Math.floor(diffInMs / day)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (diffInMs < month) {
      const weeks = Math.floor(diffInMs / week)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else if (diffInMs < year) {
      const months = Math.floor(diffInMs / month)
      return `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffInMs / year)
      return `${years} year${years > 1 ? 's' : ''} ago`
    }
  }

  /**
   * Format a duration in milliseconds to human-readable string
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Calculate progress percentage with color coding
   */
  static getProgressColor(percentage: number): {
    color: string
    variant: 'success' | 'warning' | 'error' | 'info'
  } {
    if (percentage >= 90) {
      return { color: '#10B981', variant: 'success' }
    } else if (percentage >= 70) {
      return { color: '#F59E0B', variant: 'warning' }
    } else if (percentage >= 50) {
      return { color: '#F97316', variant: 'warning' }
    } else {
      return { color: '#EF4444', variant: 'error' }
    }
  }

  /**
   * Get difficulty color
   */
  static getDifficultyColor(difficulty: string): string {
    const colors = {
      beginner: '#10B981', // Green
      intermediate: '#3B82F6', // Blue
      advanced: '#F59E0B', // Orange
      master: '#8B5CF6' // Purple
    }
    return colors[difficulty as keyof typeof colors] || '#6B7280'
  }

  /**
   * Get mastery level text based on score
   */
  static getMasteryLevel(score: number): {
    level: string
    icon: string
    description: string
  } {
    if (score >= 95) {
      return {
        level: 'Mastered',
        icon: '⭐',
        description: 'Perfect recall'
      }
    } else if (score >= 80) {
      return {
        level: 'Advanced',
        icon: '🎯',
        description: 'Very confident'
      }
    } else if (score >= 60) {
      return {
        level: 'Intermediate',
        icon: '📚',
        description: 'Good understanding'
      }
    } else if (score >= 40) {
      return {
        level: 'Learning',
        icon: '📖',
        description: 'Still learning'
      }
    } else if (score >= 20) {
      return {
        level: 'Beginner',
        icon: '🌱',
        description: 'Just starting'
      }
    } else {
      return {
        level: 'New',
        icon: '🆕',
        description: 'Not yet studied'
      }
    }
  }

  /**
   * Generate a unique ID
   */
  static generateId(prefix = 'word'): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 9)
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * Debounce function for performance optimization
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null
    
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  /**
   * Throttle function for performance optimization
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  /**
   * Filter words based on filter options
   */
  static filterWords(
    words: VocabularyWord[],
    options: WordFilterOptions
  ): VocabularyWord[] {
    let filtered = [...words]

    // Difficulty filter
    if (options.difficulty) {
      const difficulties = Array.isArray(options.difficulty) 
        ? options.difficulty 
        : [options.difficulty]
      filtered = filtered.filter(w => difficulties.includes(w.difficulty))
    }

    // Category filter
    if (options.category) {
      const categories = Array.isArray(options.category)
        ? options.category
        : [options.category]
      filtered = filtered.filter(w => w.category && categories.includes(w.category))
    }

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(w =>
        w.tags?.some(tag => options.tags!.includes(tag))
      )
    }

    // Mastered filter
    if (options.mastered !== undefined) {
      filtered = filtered.filter(w =>
        options.mastered ? w.masteryScore >= 90 : w.masteryScore < 90
      )
    }

    // Due for review filter
    if (options.dueForReview) {
      const now = new Date()
      filtered = filtered.filter(w => new Date(w.nextReviewAt) <= now)
    }

    // Favorite filter
    if (options.favorite !== undefined) {
      filtered = filtered.filter(w => w.favorite === options.favorite)
    }

    // Search filter
    if (options.search) {
      const searchTerm = options.search.toLowerCase()
      filtered = filtered.filter(w =>
        w.word.toLowerCase().includes(searchTerm) ||
        w.definition.toLowerCase().includes(searchTerm) ||
        w.translation?.toLowerCase().includes(searchTerm) ||
        w.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Date range filter
    if (options.dateRange) {
      const start = new Date(options.dateRange.start)
      const end = new Date(options.dateRange.end)
      filtered = filtered.filter(w => {
        const date = new Date(w.createdAt)
        return date >= start && date <= end
      })
    }

    // Sorting
    if (options.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any = a[options.sortBy as keyof VocabularyWord]
        let bValue: any = b[options.sortBy as keyof VocabularyWord]

        // Handle special cases
        if (options.sortBy === 'nextReviewAt') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }

        if (aValue < bValue) return options.sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return options.sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // Limit and offset
    if (options.offset !== undefined) {
      filtered = filtered.slice(options.offset)
    }
    if (options.limit !== undefined) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  /**
   * Calculate word statistics
   */
  static calculateWordStats(words: VocabularyWord[]): {
    total: number
    mastered: number
    dueForReview: number
    byDifficulty: Record<string, number>
    averageMastery: number
    upcomingReviews: Array<{ date: string; count: number }>
  } {
    const now = new Date()
    const dueForReview = words.filter(w => new Date(w.nextReviewAt) <= now).length
    
    const mastered = words.filter(w => w.masteryScore >= 90).length
    
    const byDifficulty = words.reduce((acc, w) => {
      acc[w.difficulty] = (acc[w.difficulty] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const averageMastery = words.length > 0
      ? Math.round(words.reduce((sum, w) => sum + w.masteryScore, 0) / words.length)
      : 0

    // Calculate upcoming reviews by day for next 7 days
    const upcomingReviews: Array<{ date: string; count: number }> = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      date.setHours(23, 59, 59, 999)
      
      const count = words.filter(w => {
        const reviewDate = new Date(w.nextReviewAt)
        return reviewDate <= date && reviewDate > new Date(date.setHours(0, 0, 0, 0))
      }).length
      
      if (count > 0) {
        upcomingReviews.push({
          date: date.toISOString().split('T')[0],
          count
        })
      }
    }

    return {
      total: words.length,
      mastered,
      dueForReview,
      byDifficulty,
      averageMastery,
      upcomingReviews
    }
  }

  /**
   * Generate study recommendation based on user's performance
   */
  static generateStudyRecommendation(
    words: VocabularyWord[],
    history: any[],
    dailyGoal: number
  ): {
    type: 'review' | 'new_cards' | 'master_practice' | 'break'
    priority: 'high' | 'medium' | 'low'
    message: string
    action: string
    data?: any
  } {
    const now = new Date()
    const dueCards = words.filter(w => new Date(w.nextReviewAt) <= now).length
    
    // Check for overdue cards
    if (dueCards > dailyGoal * 1.5) {
      return {
        type: 'review',
        priority: 'high',
        message: `You have ${dueCards} cards due for review. Let's catch up!`,
        action: 'Start Review',
        data: { dueCards }
      }
    }
    
    // Check for cards that will be due tomorrow
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    
    const dueTomorrow = words.filter(w => {
      const reviewDate = new Date(w.nextReviewAt)
      return reviewDate <= tomorrow && reviewDate > now
    }).length
    
    if (dueTomorrow > 0) {
      return {
        type: 'review',
        priority: 'medium',
        message: `${dueTomorrow} cards will be due tomorrow. Review them now for better retention!`,
        action: 'Preview Tomorrow',
        data: { dueTomorrow }
      }
    }
    
    // Check for new words to learn
    const newWords = words.filter(w => w.reviewCount === 0).length
    if (newWords > 0) {
      return {
        type: 'new_cards',
        priority: 'medium',
        message: `You have ${newWords} new words waiting to be learned.`,
        action: 'Learn New Words',
        data: { newWords }
      }
    }
    
    // Check for practice on mastered words
    const masteredWords = words.filter(w => w.masteryScore >= 90).length
    const reviewInterval = 7 // Days since last review for mastered words
    
    const needsMasterPractice = words.filter(w => {
      if (w.masteryScore >= 90) {
        const daysSinceReview = (now.getTime() - new Date(w.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceReview >= reviewInterval
      }
      return false
    }).length
    
    if (needsMasterPractice > 0) {
      return {
        type: 'master_practice',
        priority: 'low',
        message: `Practice ${needsMasterPractice} mastered words to keep them fresh.`,
        action: 'Master Practice',
        data: { needsMasterPractice }
      }
    }
    
    // Default recommendation
    return {
      type: 'review',
      priority: 'low',
      message: 'Keep up the good work! Review some cards to maintain your streak.',
      action: 'Start Study',
      data: { dueCards }
    }
  }

  /**
   * Validate word data before saving
   */
  static validateWord(word: Partial<VocabularyWord>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (!word.word || word.word.trim().length === 0) {
      errors.push('Word is required')
    }
    
    if (!word.definition || word.definition.trim().length === 0) {
      errors.push('Definition is required')
    }
    
    if (word.difficulty && !['beginner', 'intermediate', 'advanced', 'master'].includes(word.difficulty)) {
      errors.push('Invalid difficulty level')
    }
    
    if (word.masteryScore !== undefined && (word.masteryScore < 0 || word.masteryScore > 100)) {
      errors.push('Mastery score must be between 0 and 100')
    }
    
    if (word.easeFactor !== undefined && (word.easeFactor < 1.3 || word.easeFactor > 2.5)) {
      errors.push('Ease factor must be between 1.3 and 2.5')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Export words to various formats
   */
  static exportWords(
    words: VocabularyWord[],
    format: 'json' | 'csv' | 'anki' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(words, null, 2)
        
      case 'csv':
        const headers = ['Word', 'Definition', 'Translation', 'Difficulty', 'Mastery', 'Next Review']
        const rows = words.map(w => [
          `"${w.word}"`,
          `"${w.definition}"`,
          w.translation ? `"${w.translation}"` : '',
          w.difficulty,
          w.masteryScore,
          new Date(w.nextReviewAt).toLocaleDateString()
        ])
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
        
      case 'anki':
        // Anki import format (front, back, tags)
        const ankiRows = words.map(w => {
          const front = w.word
          const back = `${w.definition}\n\n${w.translation ? `Translation: ${w.translation}\n` : ''}`
          const tags = w.tags ? w.tags.join(' ') : ''
          return `${front}\t${back}\t${tags}`
        })
        return ankiRows.join('\n')
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Import words from various formats
   */
  static importWords(
    data: string,
    format: 'json' | 'csv' | 'anki'
  ): Partial<VocabularyWord>[] {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(data)
          
        case 'csv':
          const lines = data.split('\n').filter(line => line.trim())
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          const result: Partial<VocabularyWord>[] = []
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            const word: Partial<VocabularyWord> = {}
            
            headers.forEach((header, index) => {
              if (values[index]) {
                word[header.toLowerCase() as keyof VocabularyWord] = values[index] as any
              }
            })
            
            result.push(word)
          }
          return result
          
        case 'anki':
          const rows = data.split('\n').filter(line => line.trim())
          return rows.map(row => {
            const [front, back, tags] = row.split('\t')
            return {
              word: front,
              definition: back,
              tags: tags ? tags.split(' ') : []
            }
          })
          
        default:
          throw new Error(`Unsupported import format: ${format}`)
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate estimated review time
   */
  static estimateReviewTime(
    words: VocabularyWord[],
    averageTimePerCard: number = 10 // seconds
  ): {
    totalSeconds: number
    formatted: string
    breaksNeeded: number
  } {
    const totalSeconds = words.length * averageTimePerCard
    const minutes = Math.ceil(totalSeconds / 60)
    
    // Suggest breaks every 25 minutes (Pomodoro technique)
    const breaksNeeded = Math.floor(minutes / 25)
    
    return {
      totalSeconds,
      formatted: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
      breaksNeeded
    }
  }

  /**
   * Generate a random color for tags
   */
  static getTagColor(tag: string): string {
    // Generate consistent color based on tag string
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Orange
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ]
    
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
}
