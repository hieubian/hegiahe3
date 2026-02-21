/**
 * Locket Auth API  Direct Firebase Authentication
 * Locket uses Firebase Auth  call Firebase REST API directly, no third-party proxy.
 *
 * Auth flow:
 *   1. Frontend sends email + password
 *   2. POST to Firebase identitytoolkit  get idToken + refreshToken
 *   3. Use idToken to fetch Locket user profile from api.locketcamera.com
 *   4. Return token + user info to frontend
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const FIREBASE_API_KEY = process.env.LOCKET_FIREBASE_API_KEY || 'AIzaSyCQngaaXQIfJaH0aS217REgIjD7nL431So'
const LOCKET_API_URL = process.env.LOCKET_CAMERA_API_URL || 'https://api.locketcamera.com'

interface LocketAuthRequest {
  loginMethod: 'email' | 'phone'
  email?: string
  phone?: string
  password: string
}

interface LocketAuthResponse {
  success: boolean
  token?: string
  refreshToken?: string
  localId?: string
  user?: {
    uid: string
    email?: string
    displayName?: string
    photoURL?: string
  }
  message?: string
}

async function signInWithFirebase(email: string, password: string) {
  const res = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS',
        'X-Firebase-GMPID': '1:641029076083:ios:cc8eb46290d69b234fa606',
        'X-Ios-Bundle-Identifier': 'com.locket.Locket',
        'User-Agent': 'FirebaseAuth.iOS/10.23.1 com.locket.Locket/1.82.0 iPhone/18.0 hw/iPhone12_1',
        'X-Firebase-AppCheck': 'eyJraWQiOiJNbjVDS1EiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0c1wvNjQxMDI5MDc2MDgzIiwicHJvamVjdHNcL2xvY2tldC00MjUyYSJdLCJwcm92aWRlciI6ImRldmljZV9jaGVja19kZXZpY2VfaWRlbnRpZmljYXRpb24iLCJpc3MiOiJodHRwczpcL1wvZmlyZWJhc2VhcHBjaGVjay5nb29nbGVhcGlzLmNvbVwvNjQxMDI5MDc2MDgzIiwiZXhwIjoxNzIyMTY3ODk4LCJpYXQiOjE3MjIxNjQyOTgsImp0aSI6ImlHUGlsT1dDZGg4Mll3UTJXRC1neEpXeWY5TU9RRFhHcU5OR3AzTjFmRGcifQ.lqTOJfdoYLpZwYeeXtRliCdkVT7HMd7_Lj-d44BNTGuxSYPIa9yVAR4upu3vbZSh9mVHYS8kJGYtMqjP-L6YXsk_qsV_gzKC2IhVAV6KbPDRHdevMfBC6fRiOSVn7vt749GVFdZqAuDCXhCILsaMhvgDBgZoDilgAPtpNwyjz-VtRB7OdOUbuKTCqdoSOX0SJWVUMyuI8nH0-unY--YRctunK8JHZDxBaM_ahVggYPWBCpzxq9Yeq8VSPhadG_tGNaADStYPaeeUkZ7DajwWqH5ze6ESpuFNgAigwPxCM735_ZiPeD7zHYwppQA9uqTWszK9v9OvWtFCsgCEe22O8awbNbuEBTKJpDQ8xvZe8iEYyhfUPncER3S-b1CmuXR7tFCdTgQe5j7NGWjFvN_CnL7D2nudLwxWlpqwASCHvHyi8HBaJ5GpgriTLXAAinY48RukRDBi9HwEzpRecELX05KTD2lTOfQCjKyGpfG2VUHP5Xm36YbA3iqTDoDXWMvV',
      },
      body: JSON.stringify({ email, password, clientType: 'CLIENT_TYPE_IOS', returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    const errCode = data?.error?.message || 'LOGIN_FAILED'
    const messages: Record<string, string> = {
      EMAIL_NOT_FOUND: 'Email khong ton tai',
      INVALID_PASSWORD: 'Mat khau khong dung',
      USER_DISABLED: 'Tai khoan da bi vo hieu hoa',
      INVALID_LOGIN_CREDENTIALS: 'Email hoac mat khau khong dung',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Dang nhap qua nhieu lan, thu lai sau',
    }
    throw new Error(messages[errCode] || `Dang nhap that bai: ${errCode}`)
  }
  return data
}

async function fetchLocketProfile(idToken: string) {
  try {
    const res = await fetch(`${LOCKET_API_URL}/getUserProfileV2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'X-Ios-Bundle-Identifier': 'com.locket.Locket',
        'User-Agent': 'Locket/1 CFNetwork/1474 Darwin/23.0.0',
        'X-Firebase-AppCheck': 'eyJraWQiOiJNbjVDS1EiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0c1wvNjQxMDI5MDc2MDgzIiwicHJvamVjdHNcL2xvY2tldC00MjUyYSJdLCJwcm92aWRlciI6ImRldmljZV9jaGVja19kZXZpY2VfaWRlbnRpZmljYXRpb24iLCJpc3MiOiJodHRwczpcL1wvZmlyZWJhc2VhcHBjaGVjay5nb29nbGVhcGlzLmNvbVwvNjQxMDI5MDc2MDgzIiwiZXhwIjoxNzIyMjQwNjcwLCJpYXQiOjE3MjIyMzcwNzAsImp0aSI6ImFMTmF3aHlBc3E2a2ROT1FRTS1PT1FwX2gyTlU1ZDZGZUdIcUZoYTJZWXMifQ.C1dXXEB_4q1-hWNkEV66HmycPNRiTHLn3nBoVrwmIEQ2opJ6S9rO4h7_K2_EdsMQkut_p-dGU8GiWZyBLi6MohzIfANfWggYS_Et2l6ZjCGJish-lt6FlIForpe4PAnG6OPreEL1qyzjFqD5IBN0FvdKuhEFMpDwBHQeSuubpkfRaki67jxR016cAZy6VDb42H2dqTH2t7rhwr5VCzErtzEKm711DTrFm0Rxgnvk8TcqOhjno6CDkUvfFc4RYMDmPVIuuX6H8zNBDVcvR5LFmZD5eo38lUwwQU1BoyQfgEMXp2w86MjtYm6KrF7U9TUfrgMz9I5e66oFBn5vqIUE594Pi7jmkcxbt_mW29FH3B4HIIAzvI-4WrVgGSkVidq6kZGKDfBt5NjxBYzfDiOtWtnUyUJmziZAbXayrYkRoJP2g8DS2Dsc-NvwIXVV_29YdgxYFIW1PjhTp2gmXMVTb4uHHUaMmd0j4Y4NgtgPwcVswSwawgy3e6C6-K01X6Xx',
      },
      body: JSON.stringify({ data: {} }),
    })
    if (res.ok) {
      const data = await res.json()
      return data?.result || null
    }
  } catch { /* non-critical */ }
  return null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocketAuthResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }
  try {
    const { loginMethod, email, password } = req.body as LocketAuthRequest
    if (!password) return res.status(400).json({ success: false, message: 'Vui long nhap mat khau' })
    if (loginMethod === 'phone') return res.status(400).json({ success: false, message: 'Hien chi ho tro dang nhap bang email' })
    if (!email) return res.status(400).json({ success: false, message: 'Vui long nhap email' })

    const firebaseData = await signInWithFirebase(email, password)
    const idToken: string = firebaseData.idToken
    const refreshToken: string = firebaseData.refreshToken
    const localId: string = firebaseData.localId

    const profile = await fetchLocketProfile(idToken)
    const user = {
      uid: localId,
      email: firebaseData.email || email,
      displayName: profile?.name || firebaseData.displayName || '',
      photoURL: profile?.profile_picture_url || firebaseData.photoUrl || '',
    }

    return res.status(200).json({ success: true, token: idToken, refreshToken, localId, user })
  } catch (error: any) {
    console.error('Locket auth error:', error?.message)
    return res.status(401).json({ success: false, message: error?.message || 'Dang nhap that bai' })
  }
}
