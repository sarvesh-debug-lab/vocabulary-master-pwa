// src/components/StatCard.tsx
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  percentage?: number
  trend?: number
  trendLabel?: string
  alert?: boolean
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  percentage,
  trend,
  trendLabel,
  alert
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {alert && (
          <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"></span>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </h3>
      
      <div className="flex items-baseline">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {percentage !== undefined && (
          <div className="ml-2 text-sm font-medium text-green-600 dark:text-green-400">
            {percentage}%
          </div>
        )}
      </div>
      
      {trend !== undefined && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {trend > 0 ? '+' : ''}{trend} {trendLabel}
        </div>
      )}
    </div>
  )
}
