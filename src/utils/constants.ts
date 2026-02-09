// src/utils/constants.ts
/**
 * Application constants and configuration
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.VUE_APP_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
}

// Spaced Repetition Constants
export const SPACED_REPETITION = {
  MIN_EASE_FACTOR: 1.3,
  MAX_EASE_FACTOR: 2.5,
  INITIAL_EASE_FACTOR: 2.5,
  MASTERY_INCREMENT: 20,
  QUALITY_LEVELS: {
    PERFECT: 5,
    HESITATION: 4,
    DIFFICULT: 3,
    WRONG_EASY: 2,
    WRONG_HARD: 1,
    BLACKOUT: 0,
  },
  DEFAULT_INTERVALS: [1, 6], // First and second intervals in days
  MAX_INTERVAL: 365, // Maximum interval in days
  GRACE_PERIOD: 1, // Days before card is considered overdue
}

// Study Session Constants
export const STUDY = {
  MIN_CARDS_PER_SESSION: 5,
  MAX_CARDS_PER_SESSION: 100,
  DEFAULT_DAILY_GOAL: 20,
  MAX_DAILY_GOAL: 100,
  MIN_STUDY_TIME: 5, // minutes
  MAX_STREAK: 365,
  BREAK_INTERVAL: 25, // minutes (Pomodoro technique)
  BREAK_DURATION: 5, // minutes
  REVIEW_MODES: ['priority', 'random', 'difficulty', 'mastery'] as const,
  CARD_SIDES: ['front', 'back'] as const,
}

// Difficulty Levels
export const DIFFICULTY = {
  LEVELS: ['beginner', 'intermediate', 'advanced', 'master'] as const,
  COLORS: {
    beginner: '#10B981',
    intermediate: '#3B82F6',
    advanced: '#F59E0B',
    master: '#8B5CF6',
  },
  ICONS: {
    beginner: '🌱',
    intermediate: '📚',
    advanced: '🎯',
    master: '⭐',
  },
  DESCRIPTIONS: {
    beginner: 'Basic vocabulary, common words',
    intermediate: 'Everyday conversation, intermediate level',
    advanced: 'Complex vocabulary, professional terms',
    master: 'Expert level, specialized terminology',
  },
}

// Mastery Levels
export const MASTERY = {
  THRESHOLDS: {
    NEW: 0,
    BEGINNER: 20,
    LEARNING: 40,
    INTERMEDIATE: 60,
    ADVANCED: 80,
    MASTERED: 90,
  },
  COLORS: {
    NEW: '#6B7280',
    BEGINNER: '#10B981',
    LEARNING: '#3B82F6',
    INTERMEDIATE: '#F59E0B',
    ADVANCED: '#F97316',
    MASTERED: '#8B5CF6',
  },
  ICONS: {
    NEW: '🆕',
    BEGINNER: '🌱',
    LEARNING: '📖',
    INTERMEDIATE: '📚',
    ADVANCED: '🎯',
    MASTERED: '⭐',
  },
}

// Notification Constants
export const NOTIFICATION = {
  TYPES: {
    STUDY_REMINDER: 'study_reminder',
    DAILY_GOAL: 'daily_goal',
    ACHIEVEMENT: 'achievement',
    DUE_CARDS: 'due_cards',
    SESSION_COMPLETE: 'session_complete',
  },
  DEFAULT_REMINDER_TIME: '09:00',
  QUIET_HOURS: {
    START: '22:00',
    END: '08:00',
  },
  SOUNDS: {
    CORRECT: 'correct.mp3',
    INCORRECT: 'incorrect.mp3',
    COMPLETE: 'complete.mp3',
    ACHIEVEMENT: 'achievement.mp3',
  },
}

// Storage Keys
export const STORAGE_KEYS = {
  WORDS: 'vocab_words',
  HISTORY: 'vocab_history',
  PREFERENCES: 'vocab_preferences',
  SETTINGS: 'vocab_settings',
  STATS: 'vocab_stats',
  SESSION: 'current_session',
  BACKUP: 'vocab_backup_',
}

// Localization
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
]

// Categories for vocabulary organization
export const CATEGORIES = [
  'General',
  'Business',
  'Academic',
  'Technology',
  'Medical',
  'Legal',
  'Travel',
  'Food',
  'Family',
  'Emotions',
  'Nature',
  'Sports',
  'Arts',
  'Science',
  'History',
  'Politics',
  'Religion',
  'Slang',
  'Idioms',
  'Phrasal Verbs',
]

// Common Tags
export const COMMON_TAGS = [
  'basic',
  'essential',
  'advanced',
  'professional',
  'casual',
  'formal',
  'test-prep',
  'toefl',
  'ielts',
  'business',
  'academic',
  'everyday',
  'travel',
  'food',
  'family',
  'work',
  'school',
  'hobby',
  'culture',
  'grammar',
]

// Achievement Definitions
export const ACHIEVEMENTS = {
  FIRST_WORD: {
    id: 'first_word',
    name: 'First Steps',
    description: 'Add your first vocabulary word',
    icon: '👣',
    points: 10,
  },
  FIRST_REVIEW: {
    id: 'first_review',
    name: 'Getting Started',
    description: 'Complete your first study session',
    icon: '🚀',
    points: 20,
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    points: 50,
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day study streak',
    icon: '🏆',
    points: 100,
  },
  MASTER_10: {
    id: 'master_10',
    name: 'Vocabulary Veteran',
    description: 'Master 10 words',
    icon: '⭐',
    points: 30,
  },
  MASTER_100: {
    id: 'master_100',
    name: 'Century Club',
    description: 'Master 100 words',
    icon: '💯',
    points: 150,
  },
  PERFECT_SESSION: {
    id: 'perfect_session',
    name: 'Perfect Score',
    description: 'Complete a study session with 100% accuracy',
    icon: '🎯',
    points: 40,
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a study session before 8 AM',
    icon: '🌅',
    points: 25,
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a study session after 10 PM',
    icon: '🌙',
    points: 25,
  },
  MARATHON: {
    id: 'marathon',
    name: 'Study Marathon',
    description: 'Study for more than 60 minutes in one session',
    icon: '🏃',
    points: 35,
  },
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  AUTH: 'Authentication failed. Please log in again.',
  VALIDATION: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER: 'Server error. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please wait and try again.',
  STORAGE: 'Failed to save data. Please check storage permissions.',
  IMPORT: 'Failed to import data. Please check the file format.',
  EXPORT: 'Failed to export data. Please try again.',
  PERMISSION: 'Permission denied. Please check your settings.',
}

// Success Messages
export const SUCCESS_MESSAGES = {
  WORD_ADDED: 'Word added successfully!',
  WORD_UPDATED: 'Word updated successfully!',
  WORD_DELETED: 'Word deleted successfully!',
  SESSION_COMPLETE: 'Study session completed! Great job!',
  GOAL_REACHED: 'Daily goal achieved! Keep it up!',
  PROGRESS_SAVED: 'Progress saved successfully!',
  IMPORT_SUCCESS: 'Data imported successfully!',
  EXPORT_SUCCESS: 'Data exported successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
}

// UI Constants
export const UI = {
  BREAKPOINTS: {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1280,
  },
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  Z_INDEX: {
    DROPDOWN: 1000,
    MODAL: 2000,
    TOOLTIP: 3000,
    NOTIFICATION: 4000,
  },
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
    BACKGROUND: '#F9FAFB',
    CARD: '#FFFFFF',
    TEXT: '#111827',
    TEXT_SECONDARY: '#6B7280',
    BORDER: '#E5E7EB',
  },
  SHADOWS: {
    SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
}

// Date and Time Formats
export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  MEDIUM: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  FULL: 'EEEE, MMMM dd, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM dd, yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
}

// Export/Import Formats
export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  ANKI: 'anki',
  PDF: 'pdf',
} as const

// Backup Configuration
export const BACKUP = {
  AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_BACKUPS: 10,
  BACKUP_PREFIX: 'vocab_backup_',
  ENCRYPTION_KEY: 'vocab_app_backup',
}

// Performance Optimization
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  BATCH_SIZE: 50,
  LAZY_LOAD_THRESHOLD: 100,
}

// Default Word Lists
export const DEFAULT_WORDS = [
  {
    word: 'acquire',
    definition: 'To gain possession or ownership of something',
    difficulty: 'intermediate',
    tags: ['business', 'academic'],
  },
  {
    word: 'benevolent',
    definition: 'Well meaning and kindly',
    difficulty: 'advanced',
    tags: ['literature', 'emotions'],
  },
  {
    word: 'comprehensive',
    definition: 'Complete; including all or nearly all elements or aspects',
    difficulty: 'intermediate',
    tags: ['academic', 'business'],
  },
  {
    word: 'diligent',
    definition: 'Having or showing care in one\'s work or duties',
    difficulty: 'intermediate',
    tags: ['work', 'academic'],
  },
  {
    word: 'eloquent',
    definition: 'Fluent or persuasive in speaking or writing',
    difficulty: 'advanced',
    tags: ['communication', 'literature'],
  },
]

// App Configuration
export const APP_CONFIG = {
  VERSION: '1.0.0',
  NAME: 'Vocabulary Master',
  DESCRIPTION: 'An intelligent vocabulary learning application',
  AUTHOR: 'Vocabulary Master Team',
  SUPPORT_EMAIL: 'support@vocabularymaster.com',
  WEBSITE: 'https://vocabularymaster.com',
  PRIVACY_POLICY: 'https://vocabularymaster.com/privacy',
  TERMS_OF_SERVICE: 'https://vocabularymaster.com/terms',
  UPDATE_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOG_SIZE: 1000, // Max number of log entries
}

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_CLOUD_SYNC: false,
  ENABLE_SOCIAL_FEATURES: false,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_VOICE_INPUT: false,
  ENABLE_IMAGE_RECOGNITION: false,
}
