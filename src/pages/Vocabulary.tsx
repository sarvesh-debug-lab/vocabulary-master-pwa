// src/pages/Vocabulary.tsx
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, Plus, Filter, Trash2, Edit, Star, StarOff, 
  Archive, ArchiveRestore, Tag, ChevronDown, ChevronUp,
  X, Check, BookOpen
} from 'lucide-react'
import { useStore } from '@/store/store'
import { storage } from '@/services/storage.service'
import { toast } from 'react-hot-toast'

type SortField = 'word' | 'difficulty' | 'masteryScore' | 'createdAt' | 'nextReviewAt'
type SortDirection = 'asc' | 'desc'

export default function Vocabulary() {
  const { 
    vocabulary, 
    filteredVocabulary, 
    selectedWord, 
    searchQuery,
    loadVocabulary, 
    selectWord, 
    searchWords,
    deleteWord,
    updateWord
  } = useStore()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingWord, setEditingWord] = useState<any>(null)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [newWord, setNewWord] = useState({
    word: '',
    meaning: '',
    example: '',
    synonyms: [] as string[],
    antonyms: [] as string[],
    tags: [] as string[],
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'master',
    notes: ''
  })
  
  const [newTag, setNewTag] = useState('')
  const [newSynonym, setNewSynonym] = useState('')
  const [newAntonym, setNewAntonym] = useState('')
  
  const allTags = Array.from(new Set(vocabulary.flatMap(word => word.tags)))
  const difficultyOptions = ['beginner', 'intermediate', 'advanced', 'master']

  useEffect(() => {
    loadVocabulary()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchWords(searchQuery)
    }, 300)
    
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, searchWords])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchWords(e.target.value)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedWords = () => {
    return [...filteredVocabulary].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle dates
      if (sortField === 'createdAt' || sortField === 'nextReviewAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      // Handle strings case-insensitively
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  const handleAddWord = async () => {
    try {
      if (!newWord.word.trim() || !newWord.meaning.trim()) {
        toast.error('Word and meaning are required')
        return
      }

      const wordData = {
        word: newWord.word.trim(),
        meaning: newWord.meaning.trim(),
        definitions: [newWord.meaning.trim()],
        examples: newWord.example ? [newWord.example.trim()] : [],
        synonyms: newWord.synonyms,
        antonyms: newWord.antonyms,
        tags: newWord.tags,
        difficulty: newWord.difficulty,
        notes: newWord.notes || '',
        imageUrl: '',
        audioUrl: '',
        reviewCount: 0,
        interval: 0,
        easeFactor: 2.5,
        masteryScore: 0,
        nextReviewAt: new Date().toISOString(),
        isStarred: false,
        isArchived: false
      }

      await storage.addWord(wordData)
      await loadVocabulary()
      
      toast.success('Word added successfully!')
      setShowAddForm(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add word')
    }
  }

  const handleUpdateWord = async () => {
    if (!editingWord) return
    
    try {
      await updateWord(editingWord.id, {
        ...editingWord,
        updatedAt: new Date().toISOString()
      })
      
      toast.success('Word updated successfully!')
      setEditingWord(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update word')
    }
  }

  const handleDeleteWord = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this word?')) {
      try {
        await deleteWord(id)
        toast.success('Word deleted successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete word')
      }
    }
  }

  const handleToggleStar = async (word: any) => {
    try {
      await updateWord(word.id, { isStarred: !word.isStarred })
      toast.success(word.isStarred ? 'Removed from favorites' : 'Added to favorites')
    } catch (error: any) {
      toast.error('Failed to update word')
    }
  }

  const handleToggleArchive = async (word: any) => {
    try {
      await updateWord(word.id, { isArchived: !word.isArchived })
      toast.success(word.isArchived ? 'Word restored' : 'Word archived')
    } catch (error: any) {
      toast.error('Failed to update word')
    }
  }

  const resetForm = () => {
    setNewWord({
      word: '',
      meaning: '',
      example: '',
      synonyms: [],
      antonyms: [],
      tags: [],
      difficulty: 'intermediate',
      notes: ''
    })
    setNewTag('')
    setNewSynonym('')
    setNewAntonym('')
  }

  const addTag = () => {
    if (newTag.trim() && !newWord.tags.includes(newTag.trim())) {
      setNewWord({
        ...newWord,
        tags: [...newWord.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setNewWord({
      ...newWord,
      tags: newWord.tags.filter(t => t !== tag)
    })
  }

  const addSynonym = () => {
    if (newSynonym.trim() && !newWord.synonyms.includes(newSynonym.trim())) {
      setNewWord({
        ...newWord,
        synonyms: [...newWord.synonyms, newSynonym.trim()]
      })
      setNewSynonym('')
    }
  }

  const removeSynonym = (synonym: string) => {
    setNewWord({
      ...newWord,
      synonyms: newWord.synonyms.filter(s => s !== synonym)
    })
  }

  const addAntonym = () => {
    if (newAntonym.trim() && !newWord.antonyms.includes(newAntonym.trim())) {
      setNewWord({
        ...newWord,
        antonyms: [...newWord.antonyms, newAntonym.trim()]
      })
      setNewAntonym('')
    }
  }

  const removeAntonym = (antonym: string) => {
    setNewWord({
      ...newWord,
      antonyms: newWord.antonyms.filter(a => a !== antonym)
    })
  }

  const getWordStats = () => {
    const total = vocabulary.length
    const starred = vocabulary.filter(w => w.isStarred).length
    const archived = vocabulary.filter(w => w.isArchived).length
    const dueForReview = vocabulary.filter(w => 
      !w.isArchived && new Date(w.nextReviewAt) <= new Date()
    ).length
    
    return { total, starred, archived, dueForReview }
  }

  const stats = getWordStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vocabulary</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your vocabulary collection ({stats.total} words)
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Word
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Words</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Starred</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.starred}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Archived</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.archived}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due for Review</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.dueForReview}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search words, meanings, or tags..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty Filter */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</h3>
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
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag))
                          } else {
                            setSelectedTags([...selectedTags, tag])
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full ${
                          selectedTags.includes(tag)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
            {(['word', 'difficulty', 'masteryScore', 'createdAt', 'nextReviewAt'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`inline-flex items-center text-sm ${
                  sortField === field
                    ? 'text-primary-600 dark:text-primary-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {field === 'word' && 'Word'}
                {field === 'difficulty' && 'Difficulty'}
                {field === 'masteryScore' && 'Mastery'}
                {field === 'createdAt' && 'Date Added'}
                {field === 'nextReviewAt' && 'Next Review'}
                {sortField === field && (
                  sortDirection === 'asc' ? 
                    <ChevronUp className="h-4 w-4 ml-1" /> : 
                    <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Words List */}
        <div className="divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto">
          {getSortedWords().length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No words found matching your search' : 'No words yet. Add your first word!'}
              </p>
            </div>
          ) : (
            getSortedWords().map(word => (
              <div
                key={word.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                  selectedWord?.id === word.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                } ${word.isArchived ? 'opacity-60' : ''}`}
                onClick={() => selectWord(word)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {word.word}
                      </h3>
                      {word.isStarred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {word.isArchived && (
                        <Archive className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        word.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        word.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        word.difficulty === 'advanced' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {word.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {word.meaning}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {word.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                      {word.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{word.tags.length - 3} more
                        </span>
                      )}
                      
                      <div className="ml-2 text-xs text-gray-500">
                        Mastery: {Math.round(word.masteryScore)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Reviews: {word.reviewCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        Next review: {new Date(word.nextReviewAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleStar(word)
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={word.isStarred ? "Remove from favorites" : "Add to favorites"}
                    >
                      {word.isStarred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingWord(word)
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Edit word"
                    >
                      <Edit className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleArchive(word)
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={word.isArchived ? "Restore word" : "Archive word"}
                    >
                      {word.isArchived ? (
                        <ArchiveRestore className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Archive className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWord(word.id)
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                      title="Delete word"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Word Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Word</h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Word and Meaning */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Word *
                    </label>
                    <input
                      type="text"
                      value={newWord.word}
                      onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter word"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={newWord.difficulty}
                      onChange={(e) => setNewWord({...newWord, difficulty: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {difficultyOptions.map(difficulty => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meaning *
                  </label>
                  <textarea
                    value={newWord.meaning}
                    onChange={(e) => setNewWord({...newWord, meaning: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter meaning"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Example Sentence
                  </label>
                  <textarea
                    value={newWord.example}
                    onChange={(e) => setNewWord({...newWord, example: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter example sentence"
                    rows={2}
                  />
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add tag (press Enter)"
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newWord.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Synonyms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Synonyms
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSynonym}
                      onChange={(e) => setNewSynonym(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSynonym()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add synonym"
                    />
                    <button
                      onClick={addSynonym}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newWord.synonyms.map(synonym => (
                      <span
                        key={synonym}
                        className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                      >
                        {synonym}
                        <button
                          onClick={() => removeSynonym(synonym)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Antonyms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Antonyms
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newAntonym}
                      onChange={(e) => setNewAntonym(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAntonym()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add antonym"
                    />
                    <button
                      onClick={addAntonym}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newWord.antonyms.map(antonym => (
                      <span
                        key={antonym}
                        className="inline-flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full"
                      >
                        {antonym}
                        <button
                          onClick={() => removeAntonym(antonym)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newWord.notes}
                    onChange={(e) => setNewWord({...newWord, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWord}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Add Word
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Word Modal */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Word</h2>
                <button
                  onClick={() => setEditingWord(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Word
                  </label>
                  <input
                    type="text"
                    value={editingWord.word}
                    onChange={(e) => setEditingWord({...editingWord, word: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meaning
                  </label>
                  <textarea
                    value={editingWord.meaning}
                    onChange={(e) => setEditingWord({...editingWord, meaning: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingWord(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateWord}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
