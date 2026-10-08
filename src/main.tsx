import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './constants/perf' // 폰이면 <html class="lite"> — 흐림·장식 반복을 끈다(perf.ts)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
