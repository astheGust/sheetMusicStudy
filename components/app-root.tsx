import { AppShell } from './app-shell'
import { StoreProvider } from '@/lib/store'

export function AppRoot() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  )
}
