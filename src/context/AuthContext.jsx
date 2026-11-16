import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as keluarFirebase } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { auth, db } from '../lib/firebase.js'

const AuthContext = createContext(null)

const PESAN_AUTH = {
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Email atau password salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/too-many-requests': 'Terlalu banyak percobaan masuk. Coba lagi nanti.',
  'auth/network-request-failed': 'Jaringan bermasalah. Periksa koneksi internet.',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listener bertahan selama sesi, jadi refresh halaman tetap login.
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (!snap.exists()) {
          // Akun Auth tanpa dokumen users tidak boleh masuk (rules juga menolak).
          await keluarFirebase(auth)
          toast.error('Akun belum terdaftar. Hubungi admin.')
          setUser(null)
          setProfile(null)
          return
        }
        setUser(fbUser)
        setProfile(snap.data())
      } catch (e) {
        toast.error('Gagal memuat profil: ' + (e?.message || 'kesalahan tidak dikenal'))
        await keluarFirebase(auth).catch(() => {})
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  async function signIn(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      throw new Error(PESAN_AUTH[e?.code] || 'Gagal masuk. Coba lagi.')
    }
  }

  async function signOut() {
    await keluarFirebase(auth)
  }

  const value = { user, profile, role: profile?.role ?? null, loading, signIn, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return context
}
