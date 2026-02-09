// src/services/spacedRepetition.ts
import type { VocabularyWord } from '@/types'

export class SpacedRepetitionService {
  private static readonly MIN_EASE_FACTOR = 1.3
  private static readonly MAX_EASE_FACTOR = 2.5
  private static readonly INITIAL_EASE_FACTOR = 2.5
  private static readonly MASTERY_INCREMENT = 20 // Points added for correct answer
  
  /**
   * SM-2 Spaced Repetition Algorithm Implementation
   * Quality ratings:
   * 5: Perfect response
   * 4: Correct response after hesitation
   * 3: Correct response recalled with serious difficulty
   * 2: Incorrect response; where the correct one seemed easy to recall
   * 1: Incorrect response; the correct one remembered
   * 0: Complete blackout
   */
  static calculateNextReview(
    card: VocabularyWord,
    quality: 0 | 1 | 2 | 3 | 4 | 5
  ): Pick<VocabularyWord, 
    'interval' | 'easeFactor' | 'reviewCount' | 'masteryScore' | 
    'nextReviewAt' | 'lastReviewedAt'
  > {
    // Validate input
    if (quality < 0 || quality > 5) {
      throw new Error('Quality rating must be between 0 and 5')
    }

    if (card.masteryScore < 0 || card.masteryScore > 100) {
      throw new Error('Mastery score must be between 0 and 100')
    }

    // Clone the card to avoid mutations
    const currentCard = { ...card }
    
    let newInterval: number
    let newEaseFactor: number
    let newReviewCount: number

    // SM-2 Algorithm
    if (quality < 3) {
      // Incorrect response - reset interval
      newInterval = 1
      newReviewCount = 0
    } else {
      // Correct response
      if (currentCard.reviewCount === 0) {
        newInterval = 1
      } else if (currentCard.reviewCount === 1) {
        newInterval = 6
      } else {
        newInterval = Math.round(currentCard.interval * currentCard.easeFactor)
      }
      newReviewCount = currentCard.reviewCount + 1
    }

    // Calculate new ease factor with bounds
    const easeFactorChange = this.calculateEaseFactorChange(quality)
    newEaseFactor = currentCard.easeFactor + easeFactorChange
    newEaseFactor = this.clampEaseFactor(newEaseFactor)

    // Calculate mastery score with adaptive increment
    const masteryIncrement = this.calculateMasteryIncrement(quality, currentCard.masteryScore)
    const newMasteryScore = Math.min(
      100,
      Math.max(0, currentCard.masteryScore + masteryIncrement)
    )

    // Calculate next review date with some randomness for variety
    const nextReviewAt = this.calculateNextReviewDate(newInterval)

    return {
      interval: newInterval,
      easeFactor: parseFloat(newEaseFactor.toFixed(2)),
      reviewCount: newReviewCount,
      masteryScore: Math.round(newMasteryScore),
      nextReviewAt: nextReviewAt.toISOString(),
      lastReviewedAt: new Date().toISOString()
    }
  }

  /**
   * Calculate ease factor change based on quality rating
   */
  private static calculateEaseFactorChange(quality: number): number {
    // Ease factor adjustments based on SM-2 algorithm
    switch (quality) {
      case 5: return 0.15
      case 4: return 0.10
      case 3: return 0.05
      case 2: return -0.15
      case 1: return -0.25
      case 0: return -0.30
      default: return 0
    }
  }

  /**
   * Clamp ease factor to reasonable bounds
   */
  private static clampEaseFactor(easeFactor: number): number {
    return Math.max(
      this.MIN_EASE_FACTOR,
      Math.min(this.MAX_EASE_FACTOR, easeFactor)
    )
  }

  /**
   * Calculate mastery increment based on quality and current mastery
   */
  private static calculateMasteryIncrement(quality: number, currentMastery: number): number {
    if (quality < 3) {
      // Incorrect responses: mastery decreases, but less for higher mastery
      const penaltyMultiplier = Math.max(0.3, 1 - (currentMastery / 100))
      return -this.MASTERY_INCREMENT * penaltyMultiplier
    }

    // Correct responses: mastery increases
    let increment = this.MASTERY_INCREMENT * (quality / 5)
    
    // Reduce increment as mastery approaches 100 (diminishing returns)
    const difficultyFactor = 1 - (currentMastery / 100) * 0.7
    return increment * difficultyFactor
  }

  /**
   * Calculate next review date with some randomness
   */
  private static calculateNextReviewDate(intervalDays: number): Date {
    const baseDate = new Date()
    
    // Add base interval
    baseDate.setDate(baseDate.getDate() + intervalDays)
    
    // Add small random variation (±10% of interval or 1 day, whichever is smaller)
    const randomVariation = Math.random() * 0.2 - 0.1 // ±10%
    const variationDays = Math.round(intervalDays * randomVariation)
    const maxVariation = Math.min(Math.abs(variationDays), 1)
    const finalVariation = variationDays >= 0 ? maxVariation : -maxVariation
    
    baseDate.setDate(baseDate.getDate() + finalVariation)
    
    // Ensure at least tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return baseDate < tomorrow ? tomorrow : baseDate
  }

  /**
   * Calculate performance consistency (standard deviation normalized)
   */
  private static calculateConsistency(accuracies: number[]): number {
    if (accuracies.length < 2) return 0.5

    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length
    const variance = accuracies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accuracies.length
    const stdDev = Math.sqrt(variance)
    
    // Convert to consistency score (0-1)
    // Lower std dev = higher consistency
    return Math.max(0, 1 - (stdDev / 50))
  }

  /**
   * Calculate priority for review queue
   * Higher priority = should be reviewed sooner
   */
  static getReviewPriority(card: VocabularyWord): number {
    const now = new Date()
    
    // Days overdue (positive if overdue, negative if not yet due)
    const daysOverdue = card.nextReviewAt
      ? Math.max(0, (now.getTime() - new Date(card.nextReviewAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Priority factors
    const overdueWeight = Math.pow(daysOverdue + 1, 1.5) // Non-linear penalty for overdue cards
    
    const masteryWeight = (100 - card.masteryScore) / 100 // Lower mastery = higher priority
    
    const difficultyWeight = {
      beginner: 0.8,
      intermediate: 1.0,
      advanced: 1.2,
      master: 1.5
    }[card.difficulty] || 1.0

    const recencyPenalty = card.reviewCount === 0 ? 0.5 : 1.0 // New cards get slight penalty

    // Combined priority score
    return (overdueWeight * 2 + masteryWeight * 3) * difficultyWeight * recencyPenalty
  }

  /**
   * Get summary of due cards
   */
  static getDueCardsSummary(cards: VocabularyWord[]): {
    dueNow: number
    dueToday: number
    dueThisWeek: number
    priorityQueue: VocabularyWord[]
  } {
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    let dueNow = 0
    let dueToday = 0
    let dueThisWeek = 0

    // Calculate priority for each card
    const cardsWithPriority = cards.map(card => ({
      card,
      priority: this.getReviewPriority(card)
    }))

    // Sort by priority (highest first)
    cardsWithPriority.sort((a, b) => b.priority - a.priority)

    cardsWithPriority.forEach(({ card }) => {
      const nextReview = new Date(card.nextReviewAt)
      
      if (nextReview <= now) {
        dueNow++
      }
      if (nextReview <= endOfDay) {
        dueToday++
      }
      if (nextReview <= endOfWeek) {
        dueThisWeek++
      }
    })

    return {
      dueNow,
      dueToday,
      dueThisWeek,
      priorityQueue: cardsWithPriority.map(({ card }) => card)
    }
  }

  /**
   * Calculate optimal daily study goal based on user's performance and available time
   */
  static calculateDailyGoal(
    totalWords: number,
    dueWords: number,
    averageStudyTime: number, // in seconds
    availableTime: number, // in minutes
    averageAccuracy: number // 0-100
  ): number {
    if (totalWords === 0) return 20 // Default goal for new users

    // Base goal on due words (capped at 50)
    let baseGoal = Math.min(dueWords, 50)
    
    // Adjust based on available time
    const timeBasedGoal = Math.floor((availableTime * 60) / (averageStudyTime || 30))
    
    // Adjust based on performance (higher accuracy = can handle more)
    const performanceMultiplier = 0.5 + (averageAccuracy / 100) * 0.5
    
    // Adjust based on total words (more words = higher goal, but with diminishing returns)
    const totalWordsFactor = Math.min(Math.log10(totalWords + 1), 2)
    
    const recommended = Math.min(
      Math.max(
        10, // Minimum goal
        Math.round(
          (baseGoal * 0.4 + 
           timeBasedGoal * 0.3 + 
           totalWordsFactor * 15) * 
          performanceMultiplier
        )
      ),
      100 // Maximum goal
    )
    
    return recommended
  }

  /**
   * Adaptive learning based on performance history
   */
  static calculateOptimalReviewSchedule(
    performanceHistory: Array<{
      date: Date
      accuracy: number // 0-100
      responseTime: number // milliseconds
      difficulty: string
    }>,
    currentCard: VocabularyWord
  ): { nextInterval: number; confidence: number } {
    if (performanceHistory.length === 0) {
      return { nextInterval: 1, confidence: 0.5 }
    }

    // Calculate weighted average accuracy (recent performance weighted more)
    const weightedAccuracy = performanceHistory.reduce((sum, entry, index) => {
      const weight = Math.pow(0.9, performanceHistory.length - index - 1) // Exponential decay
      return sum + entry.accuracy * weight
    }, 0) / performanceHistory.reduce((sum, _, index) => 
      sum + Math.pow(0.9, performanceHistory.length - index - 1), 0
    )

    // Calculate response time trend (slower = more difficult)
    const recentResponseTimes = performanceHistory
      .slice(-5)
      .map(entry => entry.responseTime)
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length
      : 3000

    // Determine optimal interval based on performance
    let optimalInterval: number

    if (weightedAccuracy > 90 && avgResponseTime < 2000) {
      // Excellent performance - increase interval aggressively
      optimalInterval = Math.round(currentCard.interval * 2.5)
    } else if (weightedAccuracy > 80) {
      // Good performance - normal increase
      optimalInterval = Math.round(currentCard.interval * 2)
    } else if (weightedAccuracy > 70) {
      // Average performance - conservative increase
      optimalInterval = Math.round(currentCard.interval * 1.5)
    } else if (weightedAccuracy > 60) {
      // Below average - minimal increase
      optimalInterval = Math.round(currentCard.interval * 1.2)
    } else {
      // Poor performance - review soon
      optimalInterval = Math.round(currentCard.interval * 1.1)
    }

    // Apply bounds (1 day to 1 year)
    optimalInterval = Math.max(1, Math.min(365, optimalInterval))

    // Calculate confidence score (0-1)
    const consistencyScore = this.calculateConsistency(performanceHistory.map(p => p.accuracy))
    const confidence = Math.min(1, 
      (weightedAccuracy / 100) * 0.6 + 
      consistencyScore * 0.3 + 
      (avgResponseTime < 5000 ? 0.1 : 0)
    )

    return {
      nextInterval: optimalInterval,
      confidence: parseFloat(confidence.toFixed(2))
    }
  }

  /**
   * Initialize a new card with default spaced repetition values
   */
  static initializeCard(card: Omit<VocabularyWord, 
    'interval' | 'easeFactor' | 'reviewCount' | 'masteryScore' | 
    'nextReviewAt' | 'lastReviewedAt'
  >): VocabularyWord {
    return {
      ...card,
      interval: 1,
      easeFactor: this.INITIAL_EASE_FACTOR,
      reviewCount: 0,
      masteryScore: 0,
      nextReviewAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString()
    }
  }

  /**
   * Reset a card's progress while preserving word data
   */
  static resetCardProgress(card: VocabularyWord): VocabularyWord {
    return {
      ...card,
      interval: 1,
      easeFactor: this.INITIAL_EASE_FACTOR,
      reviewCount: 0,
      masteryScore: 0,
      nextReviewAt: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString()
    }
  }

  /**
   * Calculate estimated time to mastery based on current progress
   */
  static estimateTimeToMastery(
    currentMastery: number,
    averageAccuracy: number,
    reviewsPerDay: number
  ): { days: number; reviews: number } {
    if (currentMastery >= 95) {
      return { days: 0, reviews: 0 }
    }

    // Estimate additional mastery points needed
    const pointsNeeded = 100 - currentMastery
    
    // Estimate mastery gain per review based on accuracy
    const averageGainPerReview = (averageAccuracy / 100) * 15
    
    // Account for diminishing returns at higher mastery levels
    const diminishingFactor = 1 - (currentMastery / 100) * 0.5
    
    // Calculate required reviews
    const reviewsNeeded = Math.ceil(pointsNeeded / (averageGainPerReview * diminishingFactor))
    
    // Calculate days needed
    const daysNeeded = Math.ceil(reviewsNeeded / reviewsPerDay)
    
    return {
      days: daysNeeded,
      reviews: reviewsNeeded
    }
  }
}
