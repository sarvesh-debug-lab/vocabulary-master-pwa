// src/main.tsx
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { createI18n } from 'vue-i18n'
import { createHead } from '@vueuse/head'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import store from './store'
import './assets/styles/index.css'

// Import components for lazy loading
const LandingPage = () => import('./views/LandingPage.vue')
const Dashboard = () => import('./views/Dashboard.vue')
const StudySession = () => import('./views/StudySession.vue')
const WordManager = () => import('./views/WordManager.vue')
const AnalyticsView = () => import('./views/AnalyticsView.vue')
const SettingsView = () => import('./views/SettingsView.vue')
const UserProfile = () => import('./views/UserProfile.vue')
const AboutPage = () => import('./views/AboutPage.vue')

// Define route configurations
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: {
      title: 'Vocabulary Master - Learn Smarter',
      requiresAuth: false
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      requiresAuth: true
    }
  },
  {
    path: '/study',
    name: 'Study',
    component: StudySession,
    meta: {
      title: 'Study Session',
      requiresAuth: true
    }
  },
  {
    path: '/words',
    name: 'Words',
    component: WordManager,
    meta: {
      title: 'Word Manager',
      requiresAuth: true
    }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: AnalyticsView,
    meta: {
      title: 'Analytics',
      requiresAuth: true
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      title: 'Settings',
      requiresAuth: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: UserProfile,
    meta: {
      title: 'Profile',
      requiresAuth: true
    }
  },
  {
    path: '/about',
    name: 'About',
    component: AboutPage,
    meta: {
      title: 'About Vocabulary Master',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFound.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Landing' })
  } else if (to.name === 'Landing' && isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

// Update document title on route change
router.afterEach((to) => {
  const title = to.meta.title as string || 'Vocabulary Master'
  document.title = title
})

// Internationalization setup
const i18n = createI18n({
  locale: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      app: {
        title: 'Vocabulary Master',
        description: 'Learn vocabulary efficiently with spaced repetition'
      },
      navigation: {
        dashboard: 'Dashboard',
        study: 'Study',
        words: 'Words',
        analytics: 'Analytics',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login',
        signup: 'Sign Up'
      },
      study: {
        startSession: 'Start Study Session',
        nextCard: 'Next Card',
        previousCard: 'Previous Card',
        flipCard: 'Flip Card',
        submitAnswer: 'Submit Answer',
        quality: {
          0: 'Complete blackout',
          1: 'Incorrect, but remembered',
          2: 'Incorrect, seemed easy',
          3: 'Correct, with difficulty',
          4: 'Correct, with hesitation',
          5: 'Perfect recall'
        }
      }
    },
    es: {
      app: {
        title: 'Maestro de Vocabulario',
        description: 'Aprende vocabulario eficientemente con repetición espaciada'
      },
      navigation: {
        dashboard: 'Panel',
        study: 'Estudiar',
        words: 'Palabras',
        analytics: 'Análisis',
        settings: 'Configuración',
        profile: 'Perfil',
        logout: 'Cerrar Sesión',
        login: 'Iniciar Sesión',
        signup: 'Registrarse'
      }
    },
    fr: {
      app: {
        title: 'Maître du Vocabulaire',
        description: 'Apprenez du vocabulaire efficacement avec la répétition espacée'
      },
      navigation: {
        dashboard: 'Tableau de bord',
        study: 'Étudier',
        words: 'Mots',
        analytics: 'Analytique',
        settings: 'Paramètres',
        profile: 'Profil',
        logout: 'Déconnexion',
        login: 'Connexion',
        signup: "S'inscrire"
      }
    }
  }
})

// Create head instance for managing document head
const head = createHead()

// Create Pinia store instance (alternative to Vuex)
const pinia = createPinia()

// Service Worker registration for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, please refresh.')
      // Show refresh prompt to user
      if (confirm('New version available! Refresh to update?')) {
        window.location.reload()
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    },
    onRegistered(registration) {
      console.log('Service Worker registered:', registration)
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error)
    }
  })
}

// Error handling
const handleError = (error: Error) => {
  console.error('Unhandled error:', error)
  // Send error to analytics service
  if (import.meta.env.PROD) {
    // Your error reporting service integration
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  handleError(event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason)
})

// Performance monitoring
if ('performance' in window) {
  // Log initial load performance
  window.addEventListener('load', () => {
    const perfData = window.performance.timing
    const loadTime = perfData.loadEventEnd - perfData.navigationStart
    console.log(`Page loaded in ${loadTime}ms`)
    
    // Send to analytics
    if (import.meta.env.PROD) {
      // Your analytics integration
    }
  })
}

// Create and configure Vue app
const app = createApp(App)

// Register global components
const globalComponents = import.meta.glob('./components/**/*.vue', { eager: true })
for (const path in globalComponents) {
  const componentName = path
    .split('/')
    .pop()
    ?.replace(/\.\w+$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
  
  if (componentName) {
    const component = globalComponents[path] as any
    app.component(componentName, component.default || component)
  }
}

// Register global directives
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

app.directive('click-outside', {
  beforeMount(el, binding) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
})

// Global properties and mixins
app.config.globalProperties.$filters = {
  formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString()
  },
  formatTime(date: string | Date) {
    return new Date(date).toLocaleTimeString()
  },
  truncate(text: string, length: number = 100) {
    if (text.length <= length) return text
    return text.substring(0, length) + '...'
  },
  capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1)
  }
}

// Global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue error:', err, info)
  handleError(err instanceof Error ? err : new Error(String(err)))
}

// Warn about production devtools
app.config.warnHandler = (msg, vm, trace) => {
  console.warn(`Vue warn: ${msg}\n${trace}`)
}

// Performance measurement in development
if (import.meta.env.DEV) {
  app.config.performance = true
}

// Mount the app with all plugins
app
  .use(store)          // Vuex store
  .use(pinia)          // Pinia store (alternative)
  .use(router)         // Vue Router
  .use(i18n)           // Internationalization
  .use(head)           // Head management
  .mount('#app')

// Theme initialization
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', theme)
  
  // Listen for theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  })
}

// Initialize theme on load
initializeTheme()

// Log app info
console.log(
  `%cVocabulary Master v${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
  'color: #3b82f6; font-size: 16px; font-weight: bold;'
)
console.log(
  `%cEnvironment: ${import.meta.env.MODE}`,
  'color: #10b981;'
)

// Export for testing and debugging
export { app, router, store, i18n }

// Type declarations for global properties
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $filters: {
      formatDate: (date: string | Date) => string
      formatTime: (date: string | Date) => string
      truncate: (text: string, length?: number) => string
      capitalize: (text: string) => string
    }
  }
}
