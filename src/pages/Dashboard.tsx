// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, TrendingUp, Clock, AlertCircle, Award, Sparkles } from 'lucide-react'
import { useStore } from '@/store/store'
import { storage } from '@/services/storage.service'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Dashboard() {
  const { vocabulary, loadVocabulary } = useStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const words = storage.getAllWords()
      const sessions = storage.getAllSessions()
      const settings = storage.getSettings()

      const now = new Date()
      const dueWords = words.filter(word => 
        !word.isArchived && new Date(word.nextReviewAt) <= now
      )

      const learnedWords = words.filter(word => word.masteryScore >= 80)
      const weakWords = words.filter(word => word.masteryScore <= 50)

      const today = new Date().toDateString()
      const studiedToday = sessions.filter(session => 
        new Date(session.completedAt).toDateString() === today
      ).length

      setStats({
        totalWords: words.length,
        learnedWords: learnedWords.length,
        weakWords: weakWords.length,
        dueForReview: dueWords.length,
        studiedToday,
        streak: settings.streak,
        averageMastery: words.length > 0 
          ? Math.round(words.reduce((sum, word) => sum + word.masteryScore, 0) / words.length)
          : 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
            <p className="text-primary-100">
              {stats?.dueForReview 
                ? `You have ${stats.dueForReview} words due for review today.`
                : 'Great job! All caught up with your reviews.'}
            </p>
          </div>
          <Sparkles className="h-12 w-12 text-yellow-300" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Words"
          value={stats?.totalWords || 0}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Mastered"
          value={stats?.learnedWords || 0}
          icon={Award}
          color="green"
          percentage={stats?.totalWords ? Math.round((stats.learnedWords / stats.totalWords) * 100) : 0}
        />
        <StatCard
          title="Due Today"
          value={stats?.dueForReview || 0}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Weak Words"
          value={stats?.weakWords || 0}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Current Streak
            </h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{stats?.streak || 0} days</div>
            <p className="text-gray-500 dark:text-gray-400">Keep going!</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Today's Progress
            </h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{stats?.studiedToday || 0} reviews</div>
            <p className="text-gray-500 dark:text-gray-400">Completed today</p>
          </div>
        </div>
      </div>
    </div>
  )
}
