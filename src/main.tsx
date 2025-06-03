import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

import adapter from "webrtc-adapter";

console.log("Using WebRTC adapter:", adapter.browserDetails.browser, adapter.browserDetails.version);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
