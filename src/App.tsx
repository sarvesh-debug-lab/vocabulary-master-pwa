// src/App.tsx
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { store } from '@/store'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'
import { Helpers } from '@/utils/helpers'
import { SpacedRepetitionService } from '@/services/spacedRepetition'
import { NotificationService } from '@/services/notification'
import type { VocabularyWord, StudySession } from '@/types'

// Components
import Header from '@/components/Header.vue'
import Sidebar from '@/components/Sidebar.vue'
import StudyCard from '@/components/StudyCard.vue'
import WordList from '@/components/WordList.vue'
import AnalyticsDashboard from '@/components/AnalyticsDashboard.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import Modal from '@/components/Modal.vue'
import Toast from '@/components/Toast.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

import '@/assets/styles/index.css'

export default defineComponent({
  name: 'App',
  
  components: {
    Header,
    Sidebar,
    StudyCard,
    WordList,
    AnalyticsDashboard,
    SettingsPanel,
    Modal,
    Toast,
    LoadingSpinner
  },

  setup() {
    // State
    const currentView = ref<'study' | 'words' | 'analytics' | 'settings'>('study')
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const successMessage = ref<string | null>(null)
    const showAddWordModal = ref(false)
    const showSettingsModal = ref(false)
    const showHelpModal = ref(false)
    const isSidebarCollapsed = ref(false)
    const currentCardIndex = ref(0)
    const isCardFlipped = ref(false)
    const studyMode = ref<'review' | 'learn' | 'master'>('review')

    // Computed properties from store
    const words = computed(() => store.getters.filteredWords)
    const currentCard = computed(() => words.value[currentCardIndex.value])
    const dueCards = computed(() => store.getters.dueCards)
    const dailyProgress = computed(() => store.getters.dailyProgress)
    const overallStats = computed(() => store.getters.overallStats)
    const studyRecommendations = computed(() => store.getters.studyRecommendations)
    const userPreferences = computed(() => store.getters.userPreferences)

    // Initialize keyboard navigation
    const keyboardNav = useKeyboardNavigation(
      computed(() => dueCards.value),
      currentCardIndex,
      {
        onNextCard: handleNextCard,
        onPreviousCard: handlePreviousCard,
        onFlipCard: () => { isCardFlipped.value = !isCardFlipped.value },
        onSubmitAnswer: handleQualityRating,
        onShowHint: handleShowHint,
        onPlayAudio: handlePlayAudio,
        onEndSession: handleEndSession,
        onSkipCard: handleSkipCard,
        onMarkAsMastered: handleMarkAsMastered
      }
    )

    // Lifecycle hooks
    onMounted(async () => {
      await initializeApp()
    })

    // Watch for changes
    watch(() => store.state.error, (newError) => {
      if (newError) {
        showError(newError)
      }
    })

    watch(() => store.state.sessionStats.currentStreak, (streak) => {
      if (streak > 0 && streak % 5 === 0) {
        showSuccess(`Amazing! You're on a ${streak}-day streak! 🔥`)
      }
    })

    // Initialization
    async function initializeApp() {
      isLoading.value = true
      try {
        await store.dispatch('initializeStore')
        
        // Check for notifications
        await checkForNotifications()
        
        // Show welcome message for new users
        if (words.value.length === 0) {
          showHelpModal.value = true
        }
      } catch (err) {
        showError('Failed to initialize application. Please refresh the page.')
        console.error('Initialization error:', err)
      } finally {
        isLoading.value = false
      }
    }

    // Notification handling
    async function checkForNotifications() {
      if (!userPreferences.value.notifications) return

      const dueCount = dueCards.value.length
      if (dueCount > 0) {
        NotificationService.show(
          'Cards Due for Review',
          `You have ${dueCount} cards waiting for review`
        )
      }

      // Check daily goal progress
      if (dailyProgress.value.progress >= 100) {
        NotificationService.show(
          'Daily Goal Achieved! 🎉',
          'You have completed your daily goal. Keep up the great work!'
        )
      }
    }

    // Study session functions
    function handleStartStudySession() {
      if (dueCards.value.length === 0) {
        showError('No cards due for review. Add more words or check back later!')
        return
      }

      store.dispatch('startStudySession')
      currentCardIndex.value = 0
      isCardFlipped.value = false
      studyMode.value = 'review'
      
      showSuccess(`Starting study session with ${dueCards.value.length} cards`)
    }

    function handleNextCard() {
      if (currentCardIndex.value < dueCards.value.length - 1) {
        currentCardIndex.value++
        isCardFlipped.value = false
      }
    }

    function handlePreviousCard() {
      if (currentCardIndex.value > 0) {
        currentCardIndex.value--
        isCardFlipped.value = false
      }
    }

    async function handleQualityRating(quality: number) {
      if (!currentCard.value) return

      try {
        const responseTime = 1000 // Simulated response time
        const result = await store.dispatch('submitAnswer', {
          quality,
          responseTime
        })

        // Show feedback based on quality
        const feedbackMessages = [
          'Complete blackout - This word needs more practice',
          'Incorrect, but you remembered',
          'Incorrect, but seemed easy',
          'Correct, but with difficulty',
          'Correct, with hesitation',
          'Perfect recall! Excellent!'
        ]
        
        showSuccess(feedbackMessages[quality])

        // If no more cards, end session
        if (!result.hasMoreCards) {
          await handleEndSession()
        } else {
          handleNextCard()
        }
      } catch (err) {
        showError('Failed to submit answer. Please try again.')
      }
    }

    async function handleEndSession() {
      try {
        const session = await store.dispatch('endStudySession')
        
        showSuccess(
          `Session completed! Reviewed ${session.cardsReviewed} cards with ${session.accuracy}% accuracy`
        )
        
        currentCardIndex.value = 0
        isCardFlipped.value = false
      } catch (err) {
        showError('Failed to end session. Please try again.')
      }
    }

    function handleShowHint() {
      // Show hint for current card
      showSuccess(`Hint: ${currentCard.value?.usageNotes?.[0] || 'Try to remember the context'}`)
    }

    function handlePlayAudio() {
      if (currentCard.value?.audioUrl) {
        // Play audio if available
        const audio = new Audio(currentCard.value.audioUrl)
        audio.play().catch(console.error)
      } else {
        // Use text-to-speech as fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(currentCard.value?.word)
          utterance.lang = 'en-US'
          speechSynthesis.speak(utterance)
        }
      }
    }

    function handleSkipCard() {
      showSuccess('Card skipped. It will be shown again later.')
      handleNextCard()
    }

    async function handleMarkAsMastered() {
      if (!currentCard.value) return

      try {
        const updatedWord = {
          ...currentCard.value,
          masteryScore: 100,
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days later
        }
        
        await store.dispatch('updateWord', updatedWord)
        showSuccess(`"${currentCard.value.word}" marked as mastered! 🎉`)
        handleNextCard()
      } catch (err) {
        showError('Failed to mark card as mastered.')
      }
    }

    // Word management functions
    async function handleAddWord(wordData: Partial<VocabularyWord>) {
      try {
        await store.dispatch('addWord', wordData)
        showAddWordModal.value = false
        showSuccess('Word added successfully!')
      } catch (err) {
        showError('Failed to add word. Please try again.')
      }
    }

    async function handleUpdateWord(updatedWord: VocabularyWord) {
      try {
        await store.dispatch('updateWord', updatedWord)
        showSuccess('Word updated successfully!')
      } catch (err) {
        showError('Failed to update word.')
      }
    }

    async function handleDeleteWord(wordId: string) {
      if (!confirm('Are you sure you want to delete this word?')) return

      try {
        await store.dispatch('deleteWord', wordId)
        showSuccess('Word deleted successfully!')
      } catch (err) {
        showError('Failed to delete word.')
      }
    }

    function handleImportWords(file: File) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string
          const words = Helpers.importWords(content, 'json')
          
          // Add each word
          for (const wordData of words) {
            await store.dispatch('addWord', wordData)
          }
          
          showSuccess(`Imported ${words.length} words successfully!`)
        } catch (err) {
          showError('Failed to import words. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }

    function handleExportWords(format: 'json' | 'csv' | 'anki') {
      try {
        const data = Helpers.exportWords(words.value, format)
        const blob = new Blob([data], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        
        showSuccess(`Words exported successfully as ${format.toUpperCase()}!`)
      } catch (err) {
        showError('Failed to export words.')
      }
    }

    // Settings functions
    async function handleUpdatePreferences(preferences: any) {
      try {
        await store.dispatch('updatePreferences', preferences)
        showSuccess('Settings updated successfully!')
      } catch (err) {
        showError('Failed to update settings.')
      }
    }

    async function handleResetProgress() {
      try {
        await store.dispatch('resetAllProgress')
        showSuccess('All progress has been reset.')
      } catch (err) {
        showError('Failed to reset progress.')
      }
    }

    // UI helper functions
    function showError(message: string) {
      error.value = message
      setTimeout(() => {
        error.value = null
      }, 5000)
    }

    function showSuccess(message: string) {
      successMessage.value = message
      setTimeout(() => {
        successMessage.value = null
      }, 3000)
    }

    function toggleSidebar() {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }

    function changeView(view: 'study' | 'words' | 'analytics' | 'settings') {
      currentView.value = view
      if (window.innerWidth < 768) {
        isSidebarCollapsed.value = true
      }
    }

    // Render helpers
    function renderCurrentView() {
      switch (currentView.value) {
        case 'study':
          return (
            <div class="study-view">
              <div class="study-header mb-6">
                <div class="flex justify-between items-center">
                  <h2 class="text-2xl font-bold">Study Session</h2>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-primary"
                      onClick={handleStartStudySession}
                      disabled={dueCards.value.length === 0}
                    >
                      {dueCards.value.length > 0
                        ? `Review ${dueCards.value.length} Cards`
                        : 'No Cards Due'}
                    </button>
                    <button
                      class="btn btn-outline"
                      onClick={() => showAddWordModal.value = true}
                    >
                      Add New Word
                    </button>
                  </div>
                </div>
                
                <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="card">
                    <div class="card-body">
                      <h3 class="text-lg font-semibold mb-2">Daily Progress</h3>
                      <div class="flex items-center gap-4">
                        <div class="mastery-indicator">
                          <svg viewBox="0 0 36 36" class="mastery-circle">
                            <path
                              d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#e5e7eb"
                              stroke-width="3"
                            />
                            <path
                              d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#3b82f6"
                              stroke-width="3"
                              stroke-dasharray={`${dailyProgress.value.progress}, 100`}
                            />
                          </svg>
                          <div class="mastery-text">{dailyProgress.value.progress}%</div>
                        </div>
                        <div>
                          <div class="text-sm text-muted">Completed</div>
                          <div class="text-2xl font-bold">{dailyProgress.value.completed}/{dailyProgress.value.goal}</div>
                          <div class="text-xs text-muted">{dailyProgress.value.remaining} cards remaining</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="card">
                    <div class="card-body">
                      <h3 class="text-lg font-semibold mb-2">Due Cards</h3>
                      <div class="text-3xl font-bold text-primary mb-2">{dueCards.value.length}</div>
                      <div class="text-sm text-muted">Cards waiting for review</div>
                      {dueCards.value.length > 0 && (
                        <div class="mt-2 text-xs">
                          Next review: {Helpers.formatRelativeTime(dueCards.value[0].nextReviewAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div class="card">
                    <div class="card-body">
                      <h3 class="text-lg font-semibold mb-2">Recommendations</h3>
                      {studyRecommendations.value.length > 0 ? (
                        studyRecommendations.value.slice(0, 2).map((rec: any) => (
                          <div class="mb-2 last:mb-0">
                            <div class="text-sm font-medium">{rec.message}</div>
                            <button
                              class="text-xs text-primary hover:underline"
                              onClick={() => {
                                if (rec.type === 'due_cards') handleStartStudySession()
                              }}
                            >
                              {rec.action}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div class="text-sm text-muted">All caught up! Keep up the good work.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {store.state.currentCard ? (
                <div class="study-content">
                  <StudyCard
                    card={currentCard.value}
                    isFlipped={isCardFlipped.value}
                    onFlip={() => { isCardFlipped.value = !isCardFlipped.value }}
                    onQualityRating={handleQualityRating}
                    onSkip={handleSkipCard}
                    onPlayAudio={handlePlayAudio}
                  />
                  
                  <div class="study-controls mt-6 flex justify-center gap-4">
                    <button
                      class="btn btn-outline"
                      onClick={handlePreviousCard}
                      disabled={currentCardIndex.value === 0}
                    >
                      Previous
                    </button>
                    <button
                      class="btn btn-outline"
                      onClick={() => { isCardFlipped.value = !isCardFlipped.value }}
                    >
                      {isCardFlipped.value ? 'Show Word' : 'Show Definition'}
                    </button>
                    <button
                      class="btn btn-outline"
                      onClick={handleNextCard}
                      disabled={currentCardIndex.value >= dueCards.value.length - 1}
                    >
                      Next
                    </button>
                  </div>
                  
                  <div class="study-progress mt-4">
                    <div class="flex justify-between text-sm text-muted mb-1">
                      <span>Card {currentCardIndex.value + 1} of {dueCards.value.length}</span>
                      <span>
                        Mastery: {currentCard.value?.masteryScore || 0}%
                        <span class={`ml-2 difficulty-badge difficulty-${currentCard.value?.difficulty || 'beginner'}`}>
                          {currentCard.value?.difficulty}
                        </span>
                      </span>
                    </div>
                    <div class="progress">
                      <div
                        class="progress-bar"
                        style={{ width: `${((currentCardIndex.value + 1) / dueCards.value.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div class="empty-state text-center py-12">
                  <div class="text-4xl mb-4">📚</div>
                  <h3 class="text-xl font-semibold mb-2">No Active Study Session</h3>
                  <p class="text-muted mb-6">Start a study session to review your vocabulary cards.</p>
                  <button
                    class="btn btn-primary"
                    onClick={handleStartStudySession}
                    disabled={dueCards.value.length === 0}
                  >
                    Start Study Session
                  </button>
                </div>
              )}
            </div>
          )

        case 'words':
          return (
            <WordList
              words={words.value}
              onAddWord={() => { showAddWordModal.value = true }}
              onEditWord={handleUpdateWord}
              onDeleteWord={handleDeleteWord}
              onImport={handleImportWords}
              onExport={handleExportWords}
            />
          )

        case 'analytics':
          return (
            <AnalyticsDashboard
              stats={overallStats.value}
              words={words.value}
              studyHistory={store.state.studyHistory}
            />
          )

        case 'settings':
          return (
            <SettingsPanel
              preferences={userPreferences.value}
              onUpdatePreferences={handleUpdatePreferences}
              onResetProgress={handleResetProgress}
              onExportData={() => handleExportWords('json')}
            />
          )
      }
    }

    return () => (
      <div class="app">
        {/* Header */}
        <Header
          title="Vocabulary Master"
          dailyProgress={dailyProgress.value}
          streak={store.state.sessionStats.currentStreak}
          onToggleSidebar={toggleSidebar}
        />

        <div class="app-container flex">
          {/* Sidebar */}
          <Sidebar
            currentView={currentView.value}
            isCollapsed={isSidebarCollapsed.value}
            stats={overallStats.value}
            onViewChange={changeView}
          />

          {/* Main Content */}
          <main class={`main-content ${isSidebarCollapsed.value ? 'expanded' : ''}`}>
            {isLoading.value ? (
              <div class="loading-overlay">
                <LoadingSpinner size="large" />
                <div class="mt-4">Loading your vocabulary...</div>
              </div>
            ) : error.value ? (
              <div class="alert alert-error">
                {error.value}
                <button class="ml-2 text-sm underline" onClick={() => error.value = null}>
                  Dismiss
                </button>
              </div>
            ) : null}

            {successMessage.value && (
              <div class="alert alert-success">
                {successMessage.value}
              </div>
            )}

            {renderCurrentView()}

            {/* Keyboard Shortcut Help */}
            {keyboardNav.isCheatSheetVisible && (
              <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
                  <h3 class="text-xl font-bold mb-4">Keyboard Shortcuts</h3>
                  <div class="grid grid-cols-2 gap-4">
                    {Object.entries(keyboardNav.helpText.value).map(([category, shortcuts]) => (
                      <div key={category}>
                        <h4 class="font-semibold mb-2 capitalize">{category}</h4>
                        <ul class="space-y-2">
                          {(shortcuts as any).map((shortcut: any) => (
                            <li class="flex justify-between">
                              <kbd class="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                {shortcut.key}
                              </kbd>
                              <span class="text-sm">{shortcut.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div class="mt-6 text-right">
                    <button
                      class="btn btn-outline"
                      onClick={() => keyboardNav.toggleCheatSheet()}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Add Word Modal */}
        {showAddWordModal.value && (
          <Modal
            title="Add New Word"
            onClose={() => { showAddWordModal.value = false }}
          >
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const wordData = {
                word: formData.get('word') as string,
                definition: formData.get('definition') as string,
                translation: formData.get('translation') as string,
                difficulty: formData.get('difficulty') as string as any,
                tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()),
                examples: [(formData.get('example') as string) || '']
              }
              handleAddWord(wordData)
            }}>
              <div class="space-y-4">
                <div class="form-group">
                  <label class="form-label">Word *</label>
                  <input
                    type="text"
                    name="word"
                    class="form-control"
                    required
                    autofocus
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label">Definition *</label>
                  <textarea
                    name="definition"
                    class="form-control"
                    rows={3}
                    required
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div class="form-group">
                    <label class="form-label">Translation</label>
                    <input
                      type="text"
                      name="translation"
                      class="form-control"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Difficulty</label>
                    <select name="difficulty" class="form-control">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="master">Master</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    class="form-control"
                    placeholder="e.g., business, academic, travel"
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label">Example Sentence</label>
                  <textarea
                    name="example"
                    class="form-control"
                    rows={2}
                    placeholder="Use the word in a sentence..."
                  />
                </div>
                
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-outline"
                    onClick={() => { showAddWordModal.value = false }}
                  >
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    Add Word
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* Help Modal */}
        {showHelpModal.value && (
          <Modal
            title="Welcome to Vocabulary Master! 🎓"
            onClose={() => { showHelpModal.value = false }}
          >
            <div class="space-y-4">
              <p>Thank you for choosing Vocabulary Master to expand your vocabulary!</p>
              
              <h4 class="font-semibold">Getting Started:</h4>
              <ol class="list-decimal pl-5 space-y-2">
                <li>Add your first word using the "Add New Word" button</li>
                <li>Start a study session to review your words</li>
                <li>Rate each word based on how well you remembered it</li>
                <li>Track your progress in the Analytics dashboard</li>
              </ol>
              
              <h4 class="font-semibold">Tips for Success:</h4>
              <ul class="list-disc pl-5 space-y-2">
                <li>Study regularly - even 10 minutes a day makes a difference</li>
                <li>Add example sentences to remember words in context</li>
                <li>Use tags to organize words by category</li>
                <li>Try to reach your daily goal consistently</li>
              </ul>
              
              <div class="flex justify-end">
                <button
                  class="btn btn-primary"
                  onClick={() => { showHelpModal.value = false }}
                >
                  Get Started
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Toast Notifications */}
        <Toast
          message={successMessage.value || error.value || ''}
          type={error.value ? 'error' : successMessage.value ? 'success' : 'info'}
          onClose={() => {
            successMessage.value = null
            error.value = null
          }}
        />

        {/* Voice Control Indicator */}
        {keyboardNav.isVoiceActive && (
          <div class="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>Voice Control Active</span>
            </div>
          </div>
        )}
      </div>
    )
  }
})
