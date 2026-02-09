// src/pages/Study.tsx
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, Pause, SkipForward, RotateCcw, 
  Target, Timer, CheckCircle, XCircle,
  BarChart3, Settings as SettingsIcon,
  BookOpen, Zap, TrendingUp, Award
} from 'lucide-react'
import { useStore } from '@/store/store'
import Flashcard from '@/components/Flashcard'
import { toast } from 'react-hot-toast'
import { storage } from '@/services/storage.service'

type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'matching'

export default function Study() {
  const { 
    vocabulary,
    studyMode: globalStudyMode,
    setStudyMode,
    startStudySession,
    endStudySession,
    currentSession,
    submitAnswer
  } = useStore()
  
  const [mode, setMode] = useState<StudyMode>('flashcard')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [studyWords, setStudyWords] = useState<any[]>([])
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    startTime: 0,
    timeSpent: 0
  })
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [showSessionComplete, setShowSessionComplete] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedDifficulties, useState<string[]>([])
  const [studyLimit, setStudyLimit] = useState(20)

  // Get due words for study
  const dueWords = vocabulary.filter(word => 
    !word.isArchived && new Date(word.nextReviewAt) <= new Date()
  )

  // Get filtered words based on selection
  const getFilteredWords = useCallback(() => {
    let filtered = dueWords
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(word => 
        word.tags.some((tag: string) => selectedTags.includes(tag))
      )
    }
    
    if (selectedDifficulties.length > 0) {
      filtered = filtered.filter(word => 
        selectedDifficulties.includes(word.difficulty)
      )
    }
    
    return filtered.slice(0, studyLimit)
  }, [dueWords, selectedTags, selectedDifficulties, studyLimit])

  const allTags = Array.from(new Set(vocabulary.flatMap(word => word.tags)))
  const difficultyOptions = ['beginner', 'intermediate', 'advanced', 'master']

  useEffect(() => {
    if (globalStudyMode) {
      setMode(globalStudyMode)
    }
  }, [globalStudyMode])

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startSession = () => {
    const wordsToStudy = getFilteredWords()
    
    if (wordsToStudy.length === 0) {
      toast.error('No words available for study with current filters')
      return
    }

    setStudyWords(wordsToStudy)
    setCurrentCardIndex(0)
    setIsCardFlipped(false)
    setIsSessionActive(true)
    setIsTimerRunning(true)
    setTimer(0)
    setSessionStats({
      total: wordsToStudy.length,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      startTime: Date.now(),
      timeSpent: 0
    })
    
    startStudySession(mode, wordsToStudy.map(w => w.id))
    toast.success(`Study session started with ${wordsToStudy.length} words`)
  }

  const handleAnswer = useCallback(async (isCorrect: boolean, responseTime: number) => {
    if (!isSessionActive || currentCardIndex >= studyWords.length) return

    const currentWord = studyWords[currentCardIndex]
    
    // Submit answer to store
    await submitAnswer(currentWord.id, isCorrect, responseTime)
    
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect,
      timeSpent: prev.timeSpent + responseTime
    }))

    // Move to next card or end session
    if (currentCardIndex < studyWords.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setIsCardFlipped(false)
    } else {
      endStudy()
    }
  }, [isSessionActive, currentCardIndex, studyWords, submitAnswer])

  const skipCard = () => {
    if (currentCardIndex < studyWords.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setIsCardFlipped(false)
      setSessionStats(prev => ({
        ...prev,
        skipped: prev.skipped + 1
      }))
    } else {
      endStudy()
    }
  }

  const toggleStar = async (wordId: string) => {
    const word = vocabulary.find(w => w.id === wordId)
    if (word) {
      try {
        await storage.updateWord(wordId, { isStarred: !word.isStarred })
        toast.success(word.isStarred ? 'Removed from favorites' : 'Added to favorites')
      } catch (error) {
        toast.error('Failed to update word')
      }
    }
  }

  const endStudy = () => {
    setIsSessionActive(false)
    setIsTimerRunning(false)
    setShowSessionComplete(true)
    
    // Calculate final stats
    const accuracy = sessionStats.total > 0 
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0
    
    // Save session
    if (currentSession) {
      endStudySession()
    }
    
    toast.success(`Study session completed! Accuracy: ${accuracy}%`)
  }

  const resetSession = () => {
    setIsSessionActive(false)
    setIsTimerRunning(false)
    setShowSessionComplete(false)
    setCurrentCardIndex(0)
    setIsCardFlipped(false)
    setTimer(0)
    setSessionStats({
      total: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      startTime: 0,
      timeSpent: 0
    })
  }

  const restartSession = () => {
    resetSession()
    startSession()
  }

  const getAccuracy = () => {
    if (sessionStats.correct + sessionStats.incorrect === 0) return 0
    return Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
  }

  const getAverageTime = () => {
    const answered = sessionStats.correct + sessionStats.incorrect
    if (answered === 0) return 0
    return Math.round(sessionStats.timeSpent / answered / 1000)
  }

  const getDueWordsStats = () => {
    const totalDue = dueWords.length
    const filteredDue = getFilteredWords().length
    
    return { totalDue, filteredDue }
  }

  const stats = getDueWordsStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSessionActive 
              ? `Studying ${currentCardIndex + 1} of ${studyWords.length} cards` 
              : `Review your vocabulary (${stats.filteredDue} words ready)`}
          </p>
        </div>
        
        {isSessionActive && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-400" />
              <span className="font-mono font-medium">{formatTime(timer)}</span>
            </div>
            <button
              onClick={endStudy}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              End Session
            </button>
          </div>
        )}
      </div>

      {/* Study Mode Selection & Stats */}
      {!isSessionActive && !showSessionComplete && (
        <>
          {/* Study Mode Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setMode('flashcard')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'flashcard'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <BookOpen className={`h-8 w-8 mb-2 ${
                  mode === 'flashcard' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                }`} />
                <h3 className="font-semibold">Flashcards</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Traditional SRS cards
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setMode('quiz')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'quiz'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <Target className={`h-8 w-8 mb-2 ${
                  mode === 'quiz' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                }`} />
                <h3 className="font-semibold">Quiz</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Multiple choice questions
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setMode('typing')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'typing'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <Zap className={`h-8 w-8 mb-2 ${
                  mode === 'typing' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                }`} />
                <h3 className="font-semibold">Typing</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Type the correct word
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setMode('matching')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'matching'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <TrendingUp className={`h-8 w-8 mb-2 ${
                  mode === 'matching' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                }`} />
                <h3 className="font-semibold">Matching</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Match words with meanings
                </p>
              </div>
            </button>
          </div>

          {/* Session Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Session Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Study Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Study Limit
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={studyLimit}
                    onChange={(e) => setStudyLimit(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-medium w-12">{studyLimit}</span>
                </div>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map(difficulty => (
                    <button
                      key={difficulty}
                      onClick={() => {
                        if (selectedDifficulties.includes(difficulty)) {
                          setSelectedDifficulties(selectedDifficulties.filter(d => d !== difficulty))
                        } else {
                          setSelectedDifficulties([...selectedDifficulties, difficulty])
                        }
                      }}
                      className={`px-3 py-1 text-sm rounded-full capitalize ${
                        selectedDifficulties.includes(difficulty)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <select
                  multiple
                  value={selectedTags}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value)
                    setSelectedTags(options)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white max-h-32"
                  size={4}
                >
                  <option value="" disabled>Select tags (hold Ctrl/Cmd for multiple)</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>#{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Session Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={startSession}
                disabled={stats.filteredDue === 0}
                className="inline-flex items-center px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Study Session
                {stats.filteredDue > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {stats.filteredDue} words
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Due</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.totalDue}
                  </div>
                </div>
                <Target className="h-8 w-8 text-primary-500" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">After Filter</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.filteredDue}
                  </div>
                </div>
                <Filter className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Mastery</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {dueWords.length > 0 
                      ? Math.round(dueWords.reduce((sum, word) => sum + word.masteryScore, 0) / dueWords.length)
                      : 0}%
                  </div>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active Study Session */}
      {isSessionActive && studyWords.length > 0 && (
        <div className="space-y-6">
          {/* Progress Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentCardIndex + 1}/{studyWords.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Cards</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {sessionStats.correct}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Correct</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {sessionStats.incorrect}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Incorrect</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getAccuracy()}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.round((currentCardIndex + 1) / studyWords.length * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentCardIndex + 1) / studyWords.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Flashcard Component */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <Flashcard
              word={studyWords[currentCardIndex]}
              onNext={handleAnswer}
              onPrev={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
              onSkip={skipCard}
              onStarToggle={toggleStar}
              isFlipped={isCardFlipped}
              onFlip={() => setIsCardFlipped(!isCardFlipped)}
              currentIndex={currentCardIndex}
              totalCards={studyWords.length}
            />
          </div>
        </div>
      )}

      {/* Session Complete Modal */}
      {showSessionComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg"
          >
            <div className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
                  <Award className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Session Complete! 🎉
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Great job! You've reviewed {sessionStats.total} cards.
                </p>
              </div>

              {/* Session Results */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Cards</span>
                  <span className="font-semibold">{sessionStats.total}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Correct Answers</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {sessionStats.correct}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Incorrect Answers</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {sessionStats.incorrect}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Accuracy</span>
                  <span className="font-semibold">{getAccuracy()}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Time Spent</span>
                  <span className="font-semibold">{formatTime(timer)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Time per Card</span>
                  <span className="font-semibold">{getAverageTime()}s</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetSession}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Study
                </button>
                
                <button
                  onClick={restartSession}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Session
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
