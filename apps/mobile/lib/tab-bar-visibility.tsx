import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { Animated } from 'react-native'

type TabBarVisibilityContextValue = {
  progress: Animated.Value
  setHidden: (hidden: boolean) => void
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null)

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(1)).current
  const hiddenRef = useRef(false)

  const value = useMemo<TabBarVisibilityContextValue>(
    () => ({
      progress,
      setHidden(hidden) {
        if (hiddenRef.current === hidden) return
        hiddenRef.current = hidden
        Animated.timing(progress, {
          toValue: hidden ? 0 : 1,
          duration: 220,
          useNativeDriver: true,
        }).start()
      },
    }),
    [progress],
  )

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  )
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext)
  if (!context) {
    throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider')
  }

  return context
}
