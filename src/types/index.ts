// src/types/index.ts
export * from './vocabulary'
export * from './study'
export * from './analytics'
export * from './settings'

// Common types used across the application
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface DictionaryDefinition {
  word: string
  phonetic?: string
  phonetics?: Array<{
    text?: string
    audio?: string
  }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      synonyms: string[]
      antonyms: string[]
    }>
    synonyms: string[]
    antonyms: string[]
  }>
  license?: {
    name: string
    url: string
  }
  sourceUrls: string[]
}
