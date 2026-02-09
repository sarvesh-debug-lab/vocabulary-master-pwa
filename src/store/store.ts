// src/store/index.ts
import { createStore } from 'vuex'
import { VocabularyWord, CardStats, StudySession } from '@/types'
import { SpacedRepetitionService } from '@/services/spacedRepetition'
import { NotificationService } from '@/services/notification'

// Define state structure
interface RootState {
  words: VocabularyWord[]
  currentCard: VocabularyWord | null
  studyHistory: StudySession[]
  isLoading: boolean
  error: string | null
  activeFilter: {
    difficulty: string | null
    mastered: boolean | null
    due: boolean | null
    tags: string[]
  }
  sessionStats: {
    cardsReviewed: number
    correctAnswers: number
    startTime: Date | null
    currentStreak: number
    longestStreak: number
  }
  userPreferences: {
    dailyGoal: number
    notifications: boolean
    autoPlayAudio: boolean
    darkMode: boolean
    reviewOrder: 'priority' | 'random' | 'difficulty'
  }
}

export default createStore<RootState>({
  state: {
    words: [],
    currentCard: null,
    studyHistory: [],
    isLoading: false,
    error: null,
    activeFilter: {
      difficulty: null,
      mastered: null,
      due: null,
      tags: []
    },
    sessionStats: {
      cardsReviewed: 0,
      correctAnswers: 0,
      startTime: null,
      currentStreak: 0,
      longestStreak: 0
    },
    userPreferences: {
      dailyGoal: 20,
      notifications: true,
      autoPlayAudio: true,
      darkMode: false,
      reviewOrder: 'priority'
    }
  },

  mutations: {
    // Words management
    SET_WORDS(state, words: VocabularyWord[]) {
      state.words = words
    },
    ADD_WORD(state, word: VocabularyWord) {
      state.words.push(word)
    },
    UPDATE_WORD(state, updatedWord: VocabularyWord) {
      const index = state.words.findIndex(w => w.id === updatedWord.id)
      if (index !== -1) {
        state.words.splice(index, 1, updatedWord)
      }
    },
    DELETE_WORD(state, wordId: string) {
      state.words = state.words.filter(w => w.id !== wordId)
    },
    
    // Current card
    SET_CURRENT_CARD(state, card: VocabularyWord | null) {
      state.currentCard = card
    },
    
    // Study history
    ADD_STUDY_SESSION(state, session: StudySession) {
      state.studyHistory.push(session)
    },
    
    // Loading and error states
    SET_LOADING(state, isLoading: boolean) {
      state.isLoading = isLoading
    },
    SET_ERROR(state, error: string | null) {
      state.error = error
    },
    
    // Filter management
    SET_FILTER(state, filter: Partial<RootState['activeFilter']>) {
      state.activeFilter = { ...state.activeFilter, ...filter }
    },
    CLEAR_FILTER(state) {
      state.activeFilter = {
        difficulty: null,
        mastered: null,
        due: null,
        tags: []
      }
    },
    
    // Session stats
    UPDATE_SESSION_STATS(state, stats: Partial<RootState['sessionStats']>) {
      state.sessionStats = { ...state.sessionStats, ...stats }
    },
    RESET_SESSION_STATS(state) {
      state.sessionStats = {
        cardsReviewed: 0,
        correctAnswers: 0,
        startTime: new Date(),
        currentStreak: 0,
        longestStreak: state.sessionStats.longestStreak
      }
    },
    
    // User preferences
    SET_PREFERENCE(state, preference: Partial<RootState['userPreferences']>) {
      state.userPreferences = { ...state.userPreferences, ...preference }
    },
    LOAD_PREFERENCES(state) {
      const saved = localStorage.getItem('vocab_preferences')
      if (saved) {
        state.userPreferences = { ...state.userPreferences, ...JSON.parse(saved) }
      }
    }
  },

  actions: {
    // Initialize store
    async initializeStore({ commit, dispatch }) {
      commit('SET_LOADING', true)
      try {
        // Load saved data
        await dispatch('loadWords')
        await dispatch('loadStudyHistory')
        commit('LOAD_PREFERENCES')
        
        // Schedule notifications if enabled
        if (NotificationService.isSupported()) {
          await NotificationService.requestPermission()
        }
        
        dispatch('scheduleDailyReminders')
      } catch (error) {
        commit('SET_ERROR', error instanceof Error ? error.message : 'Failed to initialize store')
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // Words management
    async loadWords({ commit }) {
      try {
        // In a real app, this would be an API call
        const saved = localStorage.getItem('vocab_words')
        if (saved) {
          const words: VocabularyWord[] = JSON.parse(saved)
          commit('SET_WORDS', words)
        }
      } catch (error) {
        throw new Error('Failed to load words')
      }
    },

    async saveWords({ state }) {
      try {
        localStorage.setItem('vocab_words', JSON.stringify(state.words))
      } catch (error) {
        throw new Error('Failed to save words')
      }
    },

    async addWord({ commit, dispatch, state }, wordData: Omit<VocabularyWord, 'id' | keyof CardStats>) {
      const newWord = SpacedRepetitionService.initializeCard({
        id: Date.now().toString(),
        ...wordData
      })
      
      commit('ADD_WORD', newWord)
      await dispatch('saveWords')
      
      // Show notification for new word
      if (state.userPreferences.notifications) {
        NotificationService.show(
          'New Word Added',
          `Added "${wordData.word}" to your vocabulary list`
        )
      }
      
      return newWord
    },

    async updateWord({ commit, dispatch }, updatedWord: VocabularyWord) {
      commit('UPDATE_WORD', updatedWord)
      await dispatch('saveWords')
    },

    async deleteWord({ commit, dispatch }, wordId: string) {
      commit('DELETE_WORD', wordId)
      await dispatch('saveWords')
    },

    // Study session actions
    async startStudySession({ commit, getters }) {
      commit('RESET_SESSION_STATS')
      
      // Get due cards based on review order preference
      const dueCards = getters.dueCards
      if (dueCards.length === 0) {
        throw new Error('No cards due for review')
      }
      
      // Sort cards based on user preference
      let sortedCards = [...dueCards]
      const order = getters.userPreferences.reviewOrder
      
      if (order === 'priority') {
        sortedCards.sort((a, b) => 
          SpacedRepetitionService.getReviewPriority(b) - 
          SpacedRepetitionService.getReviewPriority(a)
        )
      } else if (order === 'difficulty') {
        const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2, 'master': 3 }
        sortedCards.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
      } else if (order === 'random') {
        sortedCards.sort(() => Math.random() - 0.5)
      }
      
      // Set first card
      commit('SET_CURRENT_CARD', sortedCards[0])
      
      // Show session start notification
      if (getters.userPreferences.notifications) {
        NotificationService.show(
          'Study Session Started',
          `Reviewing ${sortedCards.length} cards`
        )
      }
    },

    async submitAnswer({ commit, dispatch, state }, { quality, responseTime }: { quality: 0 | 1 | 2 | 3 | 4 | 5; responseTime: number }) {
      if (!state.currentCard) {
        throw new Error('No current card')
      }

      try {
        // Calculate next review using spaced repetition
        const updatedStats = SpacedRepetitionService.calculateNextReview(
          state.currentCard,
          quality
        )
        
        // Update word with new stats
        const updatedWord = {
          ...state.currentCard,
          ...updatedStats
        }
        
        // Update streak
        const isCorrect = quality >= 3
        const newStreak = isCorrect ? state.sessionStats.currentStreak + 1 : 0
        const longestStreak = Math.max(state.sessionStats.longestStreak, newStreak)
        
        // Update session stats
        commit('UPDATE_SESSION_STATS', {
          cardsReviewed: state.sessionStats.cardsReviewed + 1,
          correctAnswers: isCorrect ? state.sessionStats.correctAnswers + 1 : state.sessionStats.correctAnswers,
          currentStreak: newStreak,
          longestStreak
        })
        
        // Save updated word
        await dispatch('updateWord', updatedWord)
        
        // Record performance for adaptive learning
        const performanceEntry = {
          date: new Date(),
          accuracy: quality * 20, // Convert 0-5 to 0-100
          responseTime,
          difficulty: state.currentCard.difficulty
        }
        
        // Get next card
        const dueCards = this.getters.dueCards
        const currentIndex = dueCards.findIndex(card => card.id === state.currentCard?.id)
        const nextCard = dueCards[currentIndex + 1] || null
        
        commit('SET_CURRENT_CARD', nextCard)
        
        return {
          updatedWord,
          performanceEntry,
          hasMoreCards: !!nextCard
        }
      } catch (error) {
        commit('SET_ERROR', error instanceof Error ? error.message : 'Failed to process answer')
        throw error
      }
    },

    async endStudySession({ commit, dispatch, state, getters }) {
      if (!state.sessionStats.startTime) return
      
      const session: StudySession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration: new Date().getTime() - state.sessionStats.startTime.getTime(),
        cardsReviewed: state.sessionStats.cardsReviewed,
        correctAnswers: state.sessionStats.correctAnswers,
        accuracy: state.sessionStats.cardsReviewed > 0 
          ? Math.round((state.sessionStats.correctAnswers / state.sessionStats.cardsReviewed) * 100)
          : 0,
        streak: state.sessionStats.currentStreak
      }
      
      commit('ADD_STUDY_SESSION', session)
      await dispatch('saveStudyHistory')
      
      // Show session summary notification
      if (getters.userPreferences.notifications) {
        NotificationService.show(
          'Study Session Complete',
          `Reviewed ${session.cardsReviewed} cards with ${session.accuracy}% accuracy`
        )
      }
      
      commit('RESET_SESSION_STATS')
      commit('SET_CURRENT_CARD', null)
      
      return session
    },

    // Study history management
    async loadStudyHistory({ commit }) {
      try {
        const saved = localStorage.getItem('vocab_history')
        if (saved) {
          const history: StudySession[] = JSON.parse(saved)
          commit('ADD_STUDY_SESSION', ...history)
        }
      } catch (error) {
        throw new Error('Failed to load study history')
      }
    },

    async saveStudyHistory({ state }) {
      try {
        localStorage.setItem('vocab_history', JSON.stringify(state.studyHistory))
      } catch (error) {
        throw new Error('Failed to save study history')
      }
    },

    // Filter and search
    setFilter({ commit }, filter: Partial<RootState['activeFilter']>) {
      commit('SET_FILTER', filter)
    },

    clearFilter({ commit }) {
      commit('CLEAR_FILTER')
    },

    // User preferences
    async updatePreferences({ commit, dispatch }, preferences: Partial<RootState['userPreferences']>) {
      commit('SET_PREFERENCE', preferences)
      
      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem('vocab_preferences') || '{}')
      localStorage.setItem('vocab_preferences', JSON.stringify({ ...saved, ...preferences }))
      
      // Update notifications if changed
      if (preferences.notifications !== undefined) {
        if (preferences.notifications) {
          await dispatch('scheduleDailyReminders')
        } else {
          NotificationService.cancelAll()
        }
      }
    },

    // Notifications and reminders
    async scheduleDailyReminders({ getters }) {
      if (!getters.userPreferences.notifications) return
      
      const dueCount = getters.dueCardsCount
      if (dueCount > 0) {
        NotificationService.scheduleDaily({
          title: 'Time to Study!',
          body: `You have ${dueCount} cards due for review`,
          hour: 9,
          minute: 0
        })
      }
    },

    // Reset and management
    async resetAllProgress({ commit, dispatch }) {
      if (!confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        return
      }
      
      commit('SET_LOADING', true)
      try {
        const resetWords = state.words.map(word => 
          SpacedRepetitionService.resetCardProgress(word)
        )
        
        commit('SET_WORDS', resetWords)
        commit('ADD_STUDY_SESSION', [])
        commit('RESET_SESSION_STATS')
        
        await Promise.all([
          dispatch('saveWords'),
          dispatch('saveStudyHistory')
        ])
        
        // Show notification
        if (getters.userPreferences.notifications) {
          NotificationService.show(
            'Progress Reset',
            'All progress has been reset to starting values'
          )
        }
      } catch (error) {
        commit('SET_ERROR', 'Failed to reset progress')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },

  getters: {
    // Word getters
    allWords: (state) => state.words,
    totalWords: (state) => state.words.length,
    
    filteredWords: (state) => {
      let filtered = [...state.words]
      
      if (state.activeFilter.difficulty) {
        filtered = filtered.filter(w => w.difficulty === state.activeFilter.difficulty)
      }
      
      if (state.activeFilter.mastered !== null) {
        filtered = filtered.filter(w => 
          state.activeFilter.mastered ? w.masteryScore >= 90 : w.masteryScore < 90
        )
      }
      
      if (state.activeFilter.due) {
        const now = new Date()
        filtered = filtered.filter(w => new Date(w.nextReviewAt) <= now)
      }
      
      if (state.activeFilter.tags.length > 0) {
        filtered = filtered.filter(w => 
          state.activeFilter.tags.some(tag => w.tags?.includes(tag))
        )
      }
      
      return filtered
    },
    
    // Card stats getters
    dueCards: (state) => {
      const now = new Date()
      return state.words.filter(word => new Date(word.nextReviewAt) <= now)
    },
    
    dueCardsCount: (state, getters) => getters.dueCards.length,
    
    cardsByDifficulty: (state) => {
      const difficulties = ['beginner', 'intermediate', 'advanced', 'master']
      return difficulties.map(difficulty => ({
        difficulty,
        count: state.words.filter(w => w.difficulty === difficulty).length,
        mastered: state.words.filter(w => w.difficulty === difficulty && w.masteryScore >= 90).length
      }))
    },
    
    // Study stats getters
    currentSessionStats: (state) => {
      const accuracy = state.sessionStats.cardsReviewed > 0
        ? Math.round((state.sessionStats.correctAnswers / state.sessionStats.cardsReviewed) * 100)
        : 0
      
      return {
        ...state.sessionStats,
        accuracy,
        timeElapsed: state.sessionStats.startTime
          ? new Date().getTime() - state.sessionStats.startTime.getTime()
          : 0
      }
    },
    
    overallStats: (state) => {
      const totalCards = state.words.length
      const masteredCards = state.words.filter(w => w.masteryScore >= 90).length
      const totalReviews = state.words.reduce((sum, w) => sum + w.reviewCount, 0)
      
      const totalStudyTime = state.studyHistory.reduce((sum, session) => sum + session.duration, 0)
      const totalSessions = state.studyHistory.length
      const averageAccuracy = totalSessions > 0
        ? Math.round(state.studyHistory.reduce((sum, session) => sum + session.accuracy, 0) / totalSessions)
        : 0
      
      return {
        totalCards,
        masteredCards,
        masteryPercentage: totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0,
        totalReviews,
        totalStudyTime,
        totalSessions,
        averageAccuracy,
        currentStreak: state.sessionStats.currentStreak,
        longestStreak: state.sessionStats.longestStreak
      }
    },
    
    // Daily goal and progress
    dailyProgress: (state) => {
      const today = new Date().toDateString()
      const todaySessions = state.studyHistory.filter(session => 
        new Date(session.date).toDateString() === today
      )
      
      const cardsReviewedToday = todaySessions.reduce((sum, session) => sum + session.cardsReviewed, 0)
      const goal = state.userPreferences.dailyGoal
      const progress = Math.min(100, Math.round((cardsReviewedToday / goal) * 100))
      
      return {
        goal,
        completed: cardsReviewedToday,
        progress,
        remaining: Math.max(0, goal - cardsReviewedToday)
      }
    },
    
    // Recommendations
    studyRecommendations: (state, getters) => {
      const dueCards = getters.dueCards
      const dailyProgress = getters.dailyProgress
      
      const recommendations = []
      
      if (dueCards.length > 0) {
        recommendations.push({
          type: 'due_cards',
          message: `You have ${dueCards.length} cards due for review`,
          priority: 'high'
        })
      }
      
      if (dailyProgress.progress < 50) {
        recommendations.push({
          type: 'daily_goal',
          message: `You've completed ${dailyProgress.completed}/${dailyProgress.goal} cards today`,
          priority: 'medium'
        })
      }
      
      // Check for neglected cards (not reviewed in > 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const neglectedCards = state.words.filter(w => 
        new Date(w.lastReviewedAt) < weekAgo && w.masteryScore < 80
      )
      
      if (neglectedCards.length > 0) {
        recommendations.push({
          type: 'neglected_cards',
          message: `${neglectedCards.length} cards haven't been reviewed in over a week`,
          priority: 'medium'
        })
      }
      
      return recommendations
    },
    
    // Current state getters
    isLoading: (state) => state.isLoading,
    error: (state) => state.error,
    currentCard: (state) => state.currentCard,
    hasMoreCards: (state, getters) => getters.dueCards.length > 0,
    
    // User preferences
    userPreferences: (state) => state.userPreferences,
    
    // For export/import
    exportData: (state) => ({
      version: '1.0',
      exportDate: new Date().toISOString(),
      words: state.words,
      studyHistory: state.studyHistory,
      preferences: state.userPreferences
    })
  }
})
