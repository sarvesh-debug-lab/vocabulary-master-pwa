// src/pages/Analytics.tsx
import { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, Calendar, Clock, Target, 
  Award, Zap, TrendingDown, Users, BookOpen,
  PieChart, LineChart, Activity, Brain
} from 'lucide-react'
import { useStore } from '@/store/store'
import { storage } from '@/services/storage.service'

export default function Analytics() {
  const { vocabulary } = useStore()
  const [stats, setStats] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [vocabulary, timeRange])

  const loadAnalytics = () => {
    try {
      const sessions = storage.getAllSessions()
      const words = storage.getAllWords()
      const settings = storage.getSettings()

      // Calculate word statistics
      const totalWords = words.length
      const activeWords = words.filter(w => !w.isArchived).length
      const starredWords = words.filter(w => w.isStarred).length
      const dueWords = words.filter(w => 
        !w.isArchived && new Date(w.nextReviewAt) <= new Date()
      ).length
      
      const avgMastery = totalWords > 0 
        ? Math.round(words.reduce((sum, word) => sum + word.masteryScore, 0) / totalWords)
        : 0

      // Calculate difficulty distribution
      const difficultyDistribution = words.reduce((acc, word) => {
        acc[word.difficulty] = (acc[word.difficulty] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Calculate tag distribution
      const tagDistribution = words.reduce((acc, word) => {
        word.tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1
        })
        return acc
      }, {} as Record<string, number>)

      // Get top tags (limit to 10)
      const topTags = Object.entries(tagDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }))

      // Calculate session statistics
      const now = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setDate(now.getDate() - 30)
          break
        case 'year':
          startDate.setDate(now.getDate() - 365)
          break
      }

      const recentSessions = sessions.filter(session => 
        new Date(session.completedAt) >= startDate
      )

      // Calculate daily stats for chart
      const dailyStats: Record<string, { reviews: number; accuracy: number }> = {}
      
      for (let i = 0; i < (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365); i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const daySessions = sessions.filter(session => 
          session.completedAt.startsWith(dateStr)
        )
        
        const totalReviews = daySessions.reduce((sum, session) => sum + session.totalCards, 0)
        const totalCorrect = daySessions.reduce((sum, session) => sum + session.correctAnswers, 0)
        const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0
        
        dailyStats[dateStr] = { reviews: totalReviews, accuracy }
      }

      // Convert to array for chart
      const chartData = Object.entries(dailyStats)
        .map(([date, data]) => ({ date, ...data }))
        .reverse()

      // Calculate streak
      let streak = 0
      let currentDate = new Date(now)
      
      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const hasSession = sessions.some(session => 
          session.completedAt.startsWith(dateStr)
        )
        
        if (hasSession) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          break
        }
      }

      // Find best session
      const bestSession = sessions.length > 0 
        ? sessions.reduce((best, session) => 
            session.accuracy > best.accuracy ? session : best
          )
        : null

      // Find weakest words (lowest mastery)
      const weakestWords = [...words]
        .filter(w => !w.isArchived)
        .sort((a, b) => a.masteryScore - b.masteryScore)
        .slice(0, 5)

      // Calculate average session time
      const avgSessionTime = sessions.length > 0
        ? Math.round(sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length / 1000)
        : 0

      setStats({
        totalWords,
        activeWords,
        starredWords,
        dueWords,
        avgMastery,
        difficultyDistribution,
        topTags,
        recentSessions: recentSessions.length,
        totalSessions: sessions.length,
        totalReviews: sessions.reduce((sum, session) => sum + session.totalCards, 0),
        totalTime: sessions.reduce((sum, session) => sum + session.duration, 0),
        streak: settings.streak,
        longestStreak: Math.max(settings.streak, streak),
        chartData,
        bestSession,
        weakestWords,
        avgSessionTime,
        avgAccuracy: sessions.length > 0
          ? Math.round(sessions.reduce((sum, session) => sum + session.accuracy, 0) / sessions.length * 100)
          : 0
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No analytics data available yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-full ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Words</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalWords}
              </div>
            </div>
            <BookOpen className="h-8 w-8 text-primary-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Streak</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.streak} days
              </div>
            </div>
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Mastery</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.avgMastery}%
              </div>
            </div>
            <Award className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Due for Review</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.dueWords}
              </div>
            </div>
            <Target className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Session Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Statistics
            </h2>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Total Sessions</span>
              </div>
              <span className="font-semibold">{stats.totalSessions}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Total Reviews</span>
              </div>
              <span className="font-semibold">{stats.totalReviews}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Total Time</span>
              </div>
              <span className="font-semibold">
                {Math.round(stats.totalTime / 1000 / 60)} min
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Average Accuracy</span>
              </div>
              <span className="font-semibold">{stats.avgAccuracy}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Longest Streak</span>
              </div>
              <span className="font-semibold">{stats.longestStreak} days</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Avg Session Time</span>
              </div>
              <span className="font-semibold">{stats.avgSessionTime} sec</span>
            </div>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Difficulty Distribution
            </h2>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {Object.entries(stats.difficultyDistribution).map(([difficulty, count]) => (
              <div key={difficulty} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="capitalize text-gray-600 dark:text-gray-400">
                      {difficulty}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold mr-2">{count as number}</span>
                    <span className="text-gray-500 text-sm">
                      ({Math.round((count as number) / stats.totalWords * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${(count as number) / stats.totalWords * 100}%`,
                      backgroundColor: 
                        difficulty === 'beginner' ? '#10b981' :
                        difficulty === 'intermediate' ? '#3b82f6' :
                        difficulty === 'advanced' ? '#8b5cf6' :
                        '#f59e0b'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Tags & Weakest Words */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tags */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Tags
            </h2>
            <Tag className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {stats.topTags.map(({ tag, count }: { tag: string; count: number }) => (
              <div key={tag} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">#{tag}</span>
                <div className="flex items-center">
                  <span className="font-semibold mr-2">{count}</span>
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-primary-600"
                      style={{ width: `${(count / stats.totalWords) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weakest Words */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Words Needing Attention
            </h2>
            <TrendingDown className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {stats.weakestWords.map((word: any) => (
              <div key={word.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{word.word}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{word.meaning.substring(0, 40)}...</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`px-2 py-0.5 text-xs rounded-full ${
                    word.masteryScore < 30 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    word.masteryScore < 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {Math.round(word.masteryScore)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {word.reviewCount} reviews
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <LineChart className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Reviews</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Accuracy</th>
                <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Trend</th>
              </tr>
            </thead>
            <tbody>
              {stats.chartData.slice(-10).map((data: any) => (
                <tr key={data.date} className="border-b dark:border-gray-700 last:border-0">
                  <td className="py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(data.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <div className="text-sm font-medium">{data.reviews}</div>
                      {data.reviews > 0 && (
                        <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-primary-600"
                            style={{ 
                              width: `${Math.min(100, (data.reviews / Math.max(...stats.chartData.map((d: any) => d.reviews))) * 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-sm font-medium">
                      {data.accuracy}%
                    </div>
                  </td>
                  <td className="py-3">
                    {data.accuracy > 80 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : data.accuracy > 60 ? (
                      <TrendingUp className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
