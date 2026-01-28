import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/Home'
import Admin from './pages/admin/admin'
import BlurryMode from './pages/BlurryMode/blurry_mode'
import PrivacyPolicy from './pages/privacy-policy/PrivacyPolicy';
import MainLayout from './components/MainLayout/MainLayout'
import ScrollToTop from './hooks/useScrollToTop'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Navigate, Routes } from 'react-router'
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"



const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                
                <Route path="/blurry" element={<BlurryMode />} />

                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                
                {import.meta.env.VITE_ADMIN_ROUTE && import.meta.env.VITE_ADMIN_ENABLED === "true" && (
                  <Route path={import.meta.env.VITE_ADMIN_ROUTE} element={<Admin />} />
                )}
              </Route>

              {/* Catch inexistent / invalid routes and redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
      </QueryClientProvider>

      <SpeedInsights />
      <Analytics />
  </StrictMode>,
)
