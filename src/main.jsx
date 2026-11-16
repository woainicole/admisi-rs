import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { IntegrasiProvider } from './context/IntegrasiContext.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IntegrasiProvider>
          <App />
          <Toaster position="top-right" />
        </IntegrasiProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
