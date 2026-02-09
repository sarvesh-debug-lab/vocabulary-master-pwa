
// src/components/Flashcard.tsx
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/store'

interface FlashcardProps {
  word: any
  onNext: (isCorrect: boolean, responseTime: number) => void
  onPrev: () => void
  isFlipped: boolean
  onFlip: () => void
  currentIndex: number
  totalCards: number
}

export default function Flashcard({ 
  word, 
  onNext, 
  onPrev, 
  isFlipped, 
  onFlip,
  currentIndex,
  totalCards
}: FlashcardProps) {
  const [startTime, setStartTime] = useState<number>(0)

  useEffect(() => {
    setStartTime(Date.now())
  }, [word])

  const handleAnswer = useCallback((correct: boolean) => {
    const responseTime = Date.now() - startTime
    onNext(correct, responseTime)
  }, [onNext, startTime])

  const speakWord = useCallback(() => {
    if ('speechSynthesis' in window && word?.word) {
      const utterance = new SpeechSynthesisUtterance(word.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }, [word])

  if (!word) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 dark:text-gray-400">No cards available</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Card {currentIndex + 1} of {totalCards}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Container */}
      <div className="relative h-96 perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={word.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <motion.div
              className="relative w-full h-full cursor-pointer"
              onClick={onFlip}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center backface-hidden">
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                      {word.difficulty}
                    </span>
                  </div>
                  
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                    {word.word}
                  </h2>
                  
                  <div className="space-y-2 mb-8">
                    {word.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full mr-2"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      speakWord()
                    }}
                    className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Volume2 className="h-6 w-6" />
                  </button>
                  
                  <p className="mt-6 text-gray-500 dark:text-gray-400">
                    Tap card to reveal meaning
                  </p>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center backface-hidden"
                style={{ transform: 'rotateY(180deg)' }}>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Meaning
                  </h3>
                  
                  <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                    {word.meaning}
                  </p>
                  
                  {word.example && (
                    <div className="mb-8">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Example
                      </h4>
                      <p className="text-lg italic text-gray-600 dark:text-gray-400">
                        "{word.example}"
                      </p>
                    </div>
                  )}
                  
                  <p className="mt-6 text-gray-500 dark:text-gray-400">
                    Tap card to flip back
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center mt-12 space-x-6">
        <button
          onClick={onPrev}
          className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <div className="flex space-x-4">
          <button
            onClick={() => handleAnswer(false)}
            className="px-8 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium flex items-center space-x-2 transition-colors"
          >
            <X className="h-5 w-5" />
            <span>Forgot</span>
          </button>
          
          <button
            onClick={() => handleAnswer(true)}
            className="px-8 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium flex items-center space-x-2 transition-colors"
          >
            <Check className="h-5 w-5" />
            <span>Remembered</span>
          </button>
        </div>
        
        <button
          onClick={() => handleAnswer(true)}
          className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
