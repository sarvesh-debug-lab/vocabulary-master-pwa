// src/types/settings.ts
export interface UserProfile {
  id: string
  username: string
  email?: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  level: number
  experience: number
  experienceToNextLevel: number
  joinDate: string
  lastActive: string
  nativeLanguage: string
  targetLanguages: string[]
  learningGoals: string[]
  timeZone?: string
  notificationPreferences: NotificationPreferences
  privacySettings: PrivacySettings
}

export interface NotificationPreferences {
  studyReminders: boolean
  dailyGoalReminders: boolean
  achievementUnlocks: boolean
  newFeatures: boolean
  marketingEmails: boolean
  pushNotifications: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never'
  quietHours?: {
    enabled: boolean
    startTime: string // "HH:MM"
    endTime: string // "HH:MM"
  }
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private'
  showStudyStats: boolean
  showAchievements: boolean
  shareProgress: boolean
  dataCollection: boolean
  autoBackup: boolean
  deleteDataAfter?: number // days
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto'
  language: string
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: string
  animationSpeed: 'slow' | 'normal' | 'fast'
  reduceMotion: boolean
  soundEffects: boolean
  vibration: boolean
  autoSave: boolean
  autoSaveInterval: number // seconds
  offlineMode: boolean
}

export interface StudySettings {
  defaultDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  defaultDeck?: string
  dailyGoal: number
  reviewOrder: 'priority' | 'random' | 'difficulty' | 'mastery'
  autoAdvance: boolean
  showHintDelay: number // seconds
  enableTypingPractice: boolean
  enableAudio: boolean
  autoPlayAudio: boolean
  cardDisplay: {
    showPhonetic: boolean
    showTranslation: boolean
    showExamples: boolean
    showTags: boolean
  }
  reviewSettings: {
    newCardsPerDay: number
    maxReviewsPerDay: number
    easyBonus: number // percentage
    intervalModifier: number // percentage
    leechThreshold: number // number of lapses before marking as leech
  }
}

export interface BackupSettings {
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  backupLocation: 'local' | 'cloud' | 'both'
  cloudService?: 'google' | 'dropbox' | 'icloud'
  lastBackup?: string
  includeMedia: boolean
  encryption: boolean
}

export interface DataManagement {
  exportFormat: 'json' | 'csv' | 'anki'
  importSettings: {
    mergeDuplicates: boolean
    preserveStats: boolean
    updateExisting: boolean
  }
  cleanupSettings: {
    autoArchive: boolean
    archiveAfterDays: number
    deleteInactiveAfterDays?: number
    compressOldData: boolean
  }
}

export interface AccessibilitySettings {
  highContrast: boolean
  screenReader: boolean
  largerTapTargets: boolean
  disableAnimations: boolean
  colorBlindMode: boolean
  customColors?: {
    primary: string
    secondary: string
    background: string
    text: string
  }
}

export interface AdvancedSettings {
  debugMode: boolean
  developerMode: boolean
  loggingLevel: 'error' | 'warn' | 'info' | 'debug'
  enableExperiments: boolean
  cacheSize: number // MB
  syncFrequency: number // minutes
  apiEndpoint?: string
  customCSS?: string
}

export interface ExportSettings {
  includeWords: boolean
  includeHistory: boolean
  includeSettings: boolean
  includeMedia: boolean
  format: 'json' | 'csv'
  compression: boolean
}

export interface SettingsExport {
  version: string
  exportDate: string
  profile: UserProfile
  appSettings: AppSettings
  studySettings: StudySettings
  backupSettings: BackupSettings
  dataManagement: DataManagement
  accessibility: AccessibilitySettings
  advanced: AdvancedSettings
}

export interface SettingsUpdate {
  profile?: Partial<UserProfile>
  notifications?: Partial<NotificationPreferences>
  privacy?: Partial<PrivacySettings>
  app?: Partial<AppSettings>
  study?: Partial<StudySettings>
  backup?: Partial<BackupSettings>
  data?: Partial<DataManagement>
  accessibility?: Partial<AccessibilitySettings>
  advanced?: Partial<AdvancedSettings>
}
