// src/hooks/useKeyboardNavigation.ts
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import type { VocabularyWord } from '@/types'

/**
 * Custom hook for handling keyboard navigation in study sessions
 * Supports arrow keys, number keys for quality ratings, and custom shortcuts
 */
export function useKeyboardNavigation(
  cards: Ref<VocabularyWord[]>,
  currentCardIndex: Ref<number>,
  options: {
    enableNavigation?: boolean
    enableQualityShortcuts?: boolean
    enableStudyShortcuts?: boolean
    enableVoiceControl?: boolean
    onNextCard?: () => void
    onPreviousCard?: () => void
    onFlipCard?: () => void
    onSubmitAnswer?: (quality: number) => void
    onShowHint?: () => void
    onPlayAudio?: () => void
    onToggleSide?: () => void
    onEndSession?: () => void
    onSkipCard?: () => void
    onMarkAsMastered?: () => void
    onIncreaseDifficulty?: () => void
    onDecreaseDifficulty?: () => void
  } = {}
) {
  // Default options
  const {
    enableNavigation = true,
    enableQualityShortcuts = true,
    enableStudyShortcuts = true,
    enableVoiceControl = false,
    onNextCard,
    onPreviousCard,
    onFlipCard,
    onSubmitAnswer,
    onShowHint,
    onPlayAudio,
    onToggleSide,
    onEndSession,
    onSkipCard,
    onMarkAsMastered,
    onIncreaseDifficulty,
    onDecreaseDifficulty,
  } = options

  // State
  const isListening = ref(false)
  const lastKeyPress = ref<string | null>(null)
  const keyPressTime = ref<number>(0)
  const commandHistory = ref<string[]>([])
  const isHelpVisible = ref(false)
  const isCheatSheetVisible = ref(false)

  // Keyboard shortcuts configuration
  const shortcuts = {
    // Navigation
    NEXT_CARD: ['ArrowRight', 'n', ' '], // Space or right arrow
    PREVIOUS_CARD: ['ArrowLeft', 'p'],
    FLIP_CARD: ['f', 'Enter'],
    
    // Quality ratings (SM-2 algorithm)
    QUALITY_0: ['0'],
    QUALITY_1: ['1'],
    QUALITY_2: ['2'],
    QUALITY_3: ['3'],
    QUALITY_4: ['4'],
    QUALITY_5: ['5'],
    
    // Study actions
    SHOW_HINT: ['h', '/'],
    PLAY_AUDIO: ['a'],
    TOGGLE_SIDE: ['s', 't'],
    SKIP_CARD: ['k'],
    MARK_MASTERED: ['m'],
    INCREASE_DIFFICULTY: ['+', '='],
    DECREASE_DIFFICULTY: ['-', '_'],
    
    // Session control
    END_SESSION: ['Escape', 'q'],
    RESTART_SESSION: ['r'],
    
    // UI controls
    TOGGLE_HELP: ['?'],
    TOGGLE_CHEATSHEET: ['c'],
    TOGGLE_FULLSCREEN: ['F11'],
    
    // Voice control (if enabled)
    VOICE_START: ['v'],
    VOICE_STOP: ['v', 'Escape'],
  }

  // Voice commands mapping
  const voiceCommands = {
    'next': 'NEXT_CARD',
    'previous': 'PREVIOUS_CARD',
    'flip': 'FLIP_CARD',
    'hint': 'SHOW_HINT',
    'audio': 'PLAY_AUDIO',
    'skip': 'SKIP_CARD',
    'master': 'MARK_MASTERED',
    'harder': 'INCREASE_DIFFICULTY',
    'easier': 'DECREASE_DIFFICULTY',
    'end': 'END_SESSION',
    'help': 'TOGGLE_HELP',
    'cheat sheet': 'TOGGLE_CHEATSHEET',
    'quality zero': 'QUALITY_0',
    'quality one': 'QUALITY_1',
    'quality two': 'QUALITY_2',
    'quality three': 'QUALITY_3',
    'quality four': 'QUALITY_4',
    'quality five': 'QUALITY_5',
  }

  // Computed properties
  const canGoNext = computed(() => currentCardIndex.value < cards.value.length - 1)
  const canGoPrevious = computed(() => currentCardIndex.value > 0)
  const currentCard = computed(() => cards.value[currentCardIndex.value])
  const isFirstCard = computed(() => currentCardIndex.value === 0)
  const isLastCard = computed(() => currentCardIndex.value === cards.value.length - 1)

  // Help text for shortcuts
  const helpText = computed(() => ({
    navigation: [
      { key: '→ or Space', description: 'Next card' },
      { key: '← or P', description: 'Previous card' },
      { key: 'F or Enter', description: 'Flip card' },
    ],
    quality: [
      { key: '0', description: 'Blackout (No recall)' },
      { key: '1', description: 'Incorrect (Correct remembered)' },
      { key: '2', description: 'Incorrect (Seemed easy)' },
      { key: '3', description: 'Correct (Difficult recall)' },
      { key: '4', description: 'Correct (With hesitation)' },
      { key: '5', description: 'Perfect recall' },
    ],
    study: [
      { key: 'H or /', description: 'Show hint' },
      { key: 'A', description: 'Play audio' },
      { key: 'S or T', description: 'Toggle card side' },
      { key: 'K', description: 'Skip card' },
      { key: 'M', description: 'Mark as mastered' },
      { key: '+', description: 'Increase difficulty' },
      { key: '-', description: 'Decrease difficulty' },
    ],
    session: [
      { key: 'Esc or Q', description: 'End session' },
      { key: 'R', description: 'Restart session' },
    ],
    ui: [
      { key: '?', description: 'Toggle help' },
      { key: 'C', description: 'Toggle cheat sheet' },
      { key: 'F11', description: 'Toggle fullscreen' },
    ],
    voice: enableVoiceControl ? [
      { key: 'V', description: 'Start/stop voice control' },
      { key: 'Say "next"', description: 'Next card' },
      { key: 'Say "hint"', description: 'Show hint' },
      { key: 'Say "quality five"', description: 'Submit perfect score' },
    ] : [],
  }))

  // Key press handler
  const handleKeyPress = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    lastKeyPress.value = key
    keyPressTime.value = Date.now()

    // Prevent default behavior for shortcut keys
    if (shouldPreventDefault(key)) {
      event.preventDefault()
    }

    // Log the command
    commandHistory.value.push(key)
    if (commandHistory.value.length > 20) {
      commandHistory.value.shift()
    }

    // Handle the key press
    executeCommand(key, event)
  }

  // Determine if we should prevent default behavior
  const shouldPreventDefault = (key: string): boolean => {
    const preventKeys = [
      ...shortcuts.NEXT_CARD,
      ...shortcuts.PREVIOUS_CARD,
      ...shortcuts.FLIP_CARD,
      ...shortcuts.QUALITY_0,
      ...shortcuts.QUALITY_1,
      ...shortcuts.QUALITY_2,
      ...shortcuts.QUALITY_3,
      ...shortcuts.QUALITY_4,
      ...shortcuts.QUALITY_5,
      ...shortcuts.SHOW_HINT,
      ...shortcuts.PLAY_AUDIO,
      ...shortcuts.TOGGLE_SIDE,
      ...shortcuts.SKIP_CARD,
      ...shortcuts.MARK_MASTERED,
      ...shortcuts.INCREASE_DIFFICULTY,
      ...shortcuts.DECREASE_DIFFICULTY,
      ...shortcuts.END_SESSION,
      ...shortcuts.RESTART_SESSION,
      ...shortcuts.TOGGLE_HELP,
      ...shortcuts.TOGGLE_CHEATSHEET,
    ]

    return preventKeys.includes(key)
  }

  // Execute command based on key
  const executeCommand = (key: string, event: KeyboardEvent) => {
    // Navigation commands
    if (enableNavigation) {
      if (shortcuts.NEXT_CARD.includes(key) && canGoNext.value) {
        onNextCard?.()
        return
      }
      
      if (shortcuts.PREVIOUS_CARD.includes(key) && canGoPrevious.value) {
        onPreviousCard?.()
        return
      }
      
      if (shortcuts.FLIP_CARD.includes(key)) {
        onFlipCard?.()
        return
      }
    }

    // Quality rating commands
    if (enableQualityShortcuts) {
      if (shortcuts.QUALITY_0.includes(key)) {
        onSubmitAnswer?.(0)
        return
      }
      if (shortcuts.QUALITY_1.includes(key)) {
        onSubmitAnswer?.(1)
        return
      }
      if (shortcuts.QUALITY_2.includes(key)) {
        onSubmitAnswer?.(2)
        return
      }
      if (shortcuts.QUALITY_3.includes(key)) {
        onSubmitAnswer?.(3)
        return
      }
      if (shortcuts.QUALITY_4.includes(key)) {
        onSubmitAnswer?.(4)
        return
      }
      if (shortcuts.QUALITY_5.includes(key)) {
        onSubmitAnswer?.(5)
        return
      }
    }

    // Study action commands
    if (enableStudyShortcuts) {
      if (shortcuts.SHOW_HINT.includes(key)) {
        onShowHint?.()
        return
      }
      if (shortcuts.PLAY_AUDIO.includes(key)) {
        onPlayAudio?.()
        return
      }
      if (shortcuts.TOGGLE_SIDE.includes(key)) {
        onToggleSide?.()
        return
      }
      if (shortcuts.SKIP_CARD.includes(key)) {
        onSkipCard?.()
        return
      }
      if (shortcuts.MARK_MASTERED.includes(key)) {
        onMarkAsMastered?.()
        return
      }
      if (shortcuts.INCREASE_DIFFICULTY.includes(key)) {
        onIncreaseDifficulty?.()
        return
      }
      if (shortcuts.DECREASE_DIFFICULTY.includes(key)) {
        onDecreaseDifficulty?.()
        return
      }
    }

    // Session control commands
    if (shortcuts.END_SESSION.includes(key)) {
      onEndSession?.()
      return
    }
    
    if (shortcuts.RESTART_SESSION.includes(key)) {
      // Handle restart logic
      return
    }

    // UI control commands
    if (shortcuts.TOGGLE_HELP.includes(key)) {
      isHelpVisible.value = !isHelpVisible.value
      return
    }
    
    if (shortcuts.TOGGLE_CHEATSHEET.includes(key)) {
      isCheatSheetVisible.value = !isCheatSheetVisible.value
      return
    }
    
    if (key === 'f11') {
      toggleFullscreen()
      return
    }

    // Voice control commands
    if (enableVoiceControl && shortcuts.VOICE_START.includes(key)) {
      toggleVoiceControl()
      return
    }
  }

  // Voice control functionality
  const speechRecognition = ref<SpeechRecognition | null>(null)
  const isVoiceActive = ref(false)
  const voiceCommandResult = ref<string>('')

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return
    }

    const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    speechRecognition.value = new SpeechRecognitionAPI()

    if (speechRecognition.value) {
      speechRecognition.value.continuous = true
      speechRecognition.value.interimResults = true
      speechRecognition.value.lang = 'en-US'

      speechRecognition.value.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
          .toLowerCase()
        
        voiceCommandResult.value = transcript
        processVoiceCommand(transcript)
      }

      speechRecognition.value.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        stopVoiceControl()
      }

      speechRecognition.value.onend = () => {
        if (isVoiceActive.value) {
          startVoiceControl()
        }
      }
    }
  }

  const startVoiceControl = () => {
    if (speechRecognition.value) {
      try {
        speechRecognition.value.start()
        isVoiceActive.value = true
        isListening.value = true
      } catch (error) {
        console.error('Failed to start voice control:', error)
      }
    }
  }

  const stopVoiceControl = () => {
    if (speechRecognition.value) {
      try {
        speechRecognition.value.stop()
      } catch (error) {
        // Ignore stop errors
      }
      isVoiceActive.value = false
      isListening.value = false
    }
  }

  const toggleVoiceControl = () => {
    if (isVoiceActive.value) {
      stopVoiceControl()
    } else {
      startVoiceControl()
    }
  }

  const processVoiceCommand = (transcript: string) => {
    // Find matching voice command
    for (const [command, action] of Object.entries(voiceCommands)) {
      if (transcript.includes(command)) {
        // Execute the corresponding keyboard shortcut
        const shortcutAction = action as keyof typeof shortcuts
        const key = shortcuts[shortcutAction]?.[0]
        if (key) {
          // Simulate key press
          executeCommand(key, new KeyboardEvent('keydown', { key }))
        }
        break
      }
    }
  }

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen().catch(console.error)
    }
  }

  // Navigation helpers
  const goToNextCard = () => {
    if (canGoNext.value) {
      currentCardIndex.value++
      onNextCard?.()
    }
  }

  const goToPreviousCard = () => {
    if (canGoPrevious.value) {
      currentCardIndex.value--
      onPreviousCard?.()
    }
  }

  const goToCard = (index: number) => {
    if (index >= 0 && index < cards.value.length) {
      currentCardIndex.value = index
    }
  }

  const goToFirstCard = () => {
    currentCardIndex.value = 0
  }

  const goToLastCard = () => {
    currentCardIndex.value = cards.value.length - 1
  }

  const jumpToCard = (predicate: (card: VocabularyWord) => boolean) => {
    const index = cards.value.findIndex(predicate)
    if (index !== -1) {
      goToCard(index)
    }
  }

  // Hotkey combinations detection
  const checkForCombination = (keys: string[], timeout: number = 1000): boolean => {
    if (commandHistory.value.length < keys.length) return false
    
    const recentCommands = commandHistory.value.slice(-keys.length)
    const timeDifference = Date.now() - keyPressTime.value
    
    return (
      recentCommands.join('') === keys.join('') &&
      timeDifference < timeout
    )
  }

  // Initialize
  onMounted(() => {
    if (enableVoiceControl) {
      initializeSpeechRecognition()
    }

    window.addEventListener('keydown', handleKeyPress)

    // Add fullscreen change listener
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
    stopVoiceControl()
    
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  })

  const handleFullscreenChange = () => {
    // Handle any fullscreen change logic if needed
  }

  // Public API
  return {
    // State
    isListening,
    lastKeyPress,
    keyPressTime,
    isHelpVisible,
    isCheatSheetVisible,
    isVoiceActive,
    voiceCommandResult,
    
    // Computed
    canGoNext,
    canGoPrevious,
    currentCard,
    isFirstCard,
    isLastCard,
    helpText,
    
    // Methods
    goToNextCard,
    goToPreviousCard,
    goToCard,
    goToFirstCard,
    goToLastCard,
    jumpToCard,
    
    // Voice control
    startVoiceControl,
    stopVoiceControl,
    toggleVoiceControl,
    
    // UI controls
    toggleHelp: () => { isHelpVisible.value = !isHelpVisible.value },
    toggleCheatSheet: () => { isCheatSheetVisible.value = !isCheatSheetVisible.value },
    toggleFullscreen,
    
    // Utility methods
    clearCommandHistory: () => { commandHistory.value = [] },
    getLastCommands: (count: number = 5) => commandHistory.value.slice(-count),
    
    // Check for specific combinations
    isCombinationPressed: checkForCombination,
    
    // Register custom shortcuts
    registerShortcut: (action: string, keys: string[]) => {
      (shortcuts as any)[action] = keys
    },
    
    // Export configuration
    getShortcuts: () => ({ ...shortcuts }),
    getVoiceCommands: () => ({ ...voiceCommands }),
  }
}

// Type definitions for speech recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

/**
 * Utility function to create keyboard navigation for a component
 */
export function createKeyboardNavigation(config: {
  element?: HTMLElement | null
  shortcuts?: Record<string, string[]>
  onKeyPress?: (key: string, event: KeyboardEvent) => void
}) {
  const { element, shortcuts = {}, onKeyPress } = config
  
  const handleKeyPress = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    // Check custom shortcuts
    for (const [action, keys] of Object.entries(shortcuts)) {
      if (keys.includes(key)) {
        event.preventDefault()
        onKeyPress?.(action, event)
        return
      }
    }
    
    // Default handling
    onKeyPress?.(key, event)
  }
  
  const attach = () => {
    const target = element || window
    target.addEventListener('keydown', handleKeyPress)
  }
  
  const detach = () => {
    const target = element || window
    target.removeEventListener('keydown', handleKeyPress)
  }
  
  return {
    attach,
    detach,
    handleKeyPress,
  }
}

/**
 * Predefined keyboard navigation configurations for different components
 */
export const KeyboardNavigationPresets = {
  STUDY_SESSION: {
    shortcuts: {
      next: ['ArrowRight', ' ', 'n'],
      previous: ['ArrowLeft', 'p'],
      flip: ['f', 'Enter'],
      hint: ['h', '/'],
      audio: ['a'],
      quality0: ['0'],
      quality1: ['1'],
      quality2: ['2'],
      quality3: ['3'],
      quality4: ['4'],
      quality5: ['5'],
      end: ['Escape', 'q'],
    }
  },
  
  WORD_LIST: {
    shortcuts: {
      selectNext: ['ArrowDown', 'j'],
      selectPrevious: ['ArrowUp', 'k'],
      toggleSelection: [' '],
      edit: ['e', 'Enter'],
      delete: ['Delete', 'd'],
      filter: ['f'],
      search: ['/'],
      new: ['n'],
      export: ['e', 'Ctrl+e'],
      import: ['i', 'Ctrl+i'],
    }
  },
  
  ANALYTICS: {
    shortcuts: {
      previousPeriod: ['ArrowLeft'],
      nextPeriod: ['ArrowRight'],
      toggleView: ['v'],
      export: ['e'],
      refresh: ['r'],
      help: ['?'],
    }
  },
}

export default useKeyboardNavigation
