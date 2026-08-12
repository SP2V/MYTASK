import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  )
}

export default App
