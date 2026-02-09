// src/components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex items-center justify-center" role="status">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]}`}>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )
}
