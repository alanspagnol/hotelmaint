import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_user')) } catch { return null }
  })
  const [hotel, setHotel] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hm_hotel')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha })
    localStorage.setItem('hm_token', data.token)
    localStorage.setItem('hm_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem('hm_token')
    localStorage.removeItem('hm_user')
    localStorage.removeItem('hm_hotel')
    setUser(null)
    setHotel(null)
  }

  function selectHotel(h) {
    setHotel(h)
    localStorage.setItem('hm_hotel', JSON.stringify(h))
  }

  const hotelId = hotel?.id || user?.hotel_id

  return (
    <AuthContext.Provider value={{ user, hotel, hotelId, login, logout, selectHotel, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
