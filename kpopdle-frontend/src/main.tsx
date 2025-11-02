import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/Home'
import Admin from './pages/admin/admin'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'



const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            {import.meta.env.VITE_ADMIN_ROUTE && (
              <Route path={import.meta.env.VITE_ADMIN_ROUTE} element={<Admin />} />
            )}
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
  </StrictMode>,
)
