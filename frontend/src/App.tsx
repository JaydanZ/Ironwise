import { routeTree } from 'routeTree.gen'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from './components/theme-provider'
import {
  pageTransitions,
  supportsViewTransitionTypes
} from './lib/pageTransitions'

export const router = createRouter({
  routeTree,
  // Only back and forward through slid pages animate. Without type support
  // every navigation would crossfade, so leave transitions off there
  defaultViewTransition: supportsViewTransitionTypes()
    ? pageTransitions.historyDefault
    : false
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
