/**
 * Locket Auth API — Real integration with Locket Dio backend
 * Follows hegiahe2 philosophy: minimal, direct, no unnecessary abstraction
 *
 * Auth flow:
 *   1. Frontend sends email/phone + password
 *   2. This route proxies to auth.locket-dio.com
 *   3. Returns idToken, refreshToken, localId, user info
 *   4. Frontend stores credentials for subsequent API calls
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const LOCKET_AUTH_URL = process.env.LOCKET_AUTH_URL || 'https://auth.locket-dio.com'
const LOCKET_API_KEY = process.env.LOCKET_API_KEY || 'LKD-LOCKETDIO-AB02F55KYM55DD02MM03YY25-LKD'

// Headers PHẢI khớp chính xác với Client-Locket-Dio-main/src/lib/axios.auth.js
// Server Locket Dio kiểm tra: x-app-*, Origin, User-Agent → sai sẽ trả 403 Permission Denied
const AUTH_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-api-key': LOCKET_API_KEY,
  'x-app-author': 'dio',
  'x-app-name': 'locketdio',
  'x-app-client': 'Beta2.5.5.2.4',
  'x-app-api': 'v2.2.1',
  'x-app-env': 'production',
  // Origin + User-Agent BẮT BUỘC khi gọi từ server-side (không có browser context)
  // Server check CORS whitelist qua Origin, Cloudflare chặn bot-like User-Agent
  'Origin': 'https://locket-dio.com',
  'Referer': 'https://locket-dio.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
}

interface LocketAuthRequest {
  loginMethod: 'email' | 'phone'
  email?: string
  phone?: string
  password: string
  captchaToken?: string
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

/**
 * Validate email exists on Locket before login attempt
 * Matches: Client-Locket-Dio-main/src/services/LocketDioServices/AuthServices.js → ValidateEmailAddress
 */
async function validateEmail(email: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.locketcamera.com/validateEmailAddress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'X-Ios-Bundle-Identifier': 'com.locket.Locket',
        'X-Client-Version': 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS',
        'X-Firebase-GMPID': '1:641029076083:ios:cc8eb46290d69b234fa606',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        data: { email, operation: 'sign_in', platform: 'ios' }
      })
    })
    const data = await res.json()
    // status 601 = email not found
    return data?.result?.status !== 601
  } catch {
    return true // proceed if validation fails
  }
}

/**
 * Authenticate with Locket Dio backend
 * Email: POST /locket/loginV2
 * Phone: POST /locket/loginWithPhoneV2
 */
async function authenticateWithLocket(data: LocketAuthRequest) {
  const endpoint = data.loginMethod === 'email'
    ? `${LOCKET_AUTH_URL}/locket/loginV2`
    : `${LOCKET_AUTH_URL}/locket/loginWithPhoneV2`

  const body = data.loginMethod === 'email'
    ? { email: data.email, password: data.password, captchaToken: data.captchaToken || '' }
    : { phone: data.phone, password: data.password, captchaToken: data.captchaToken || '' }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify(body),
    // @ts-ignore - credentials for cookie support
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const msg = errorData?.message || errorData?.error || errorData?.msg || `Login failed (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  return await res.json()
}

/**
 * Fetch user profile after successful login
 * Matches: Client-Locket-Dio-main/src/services/LocketDioServices/AuthServices.js → GetUserLocket
 */
async function fetchUserProfile(idToken: string) {
  try {
    const res = await fetch(`${LOCKET_AUTH_URL}/locket/getInfoUser`, {
      method: 'GET',
      headers: {
        ...AUTH_HEADERS,
        'Authorization': `Bearer ${idToken}`,
      },
    })
    if (res.ok) {
      const data = await res.json()
      return data?.data || null
    }
  } catch {
    // non-critical — we still have basic info from login response
  }
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
    const { loginMethod, email, phone, password, captchaToken } = req.body as LocketAuthRequest

    // Validate input
    if (!password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu' })
    }
    if (loginMethod === 'email' && !email) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email' })
    }
    if (loginMethod === 'phone' && !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại' })
    }

    // Validate email exists on Locket
    if (loginMethod === 'email' && email) {
      const emailExists = await validateEmail(email)
      if (!emailExists) {
        return res.status(404).json({ success: false, message: 'Tài khoản với email này không tồn tại' })
      }
    }

    // Authenticate with Locket Dio
    const authResult = await authenticateWithLocket({ loginMethod, email, phone, password, captchaToken })

    if (authResult?.success === false) {
      return res.status(401).json({
        success: false,
        message: authResult.message || 'Đăng nhập thất bại'
      })
    }

    // Extract credentials from response
    // Response format from Locket Dio auth server
    const idToken = authResult?.data?.idToken || authResult?.idToken || authResult?.token
    const refreshToken = authResult?.data?.refreshToken || authResult?.refreshToken
    const localId = authResult?.data?.localId || authResult?.localId || authResult?.data?.user_id

    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Không nhận được token xác thực' })
    }

    // Fetch extended user profile
    const userProfile = await fetchUserProfile(idToken)

    const user = {
      uid: localId || userProfile?.uid || '',
      email: authResult?.data?.email || email || userProfile?.email || '',
      displayName: authResult?.data?.displayName || userProfile?.displayName || userProfile?.username || '',
      photoURL: authResult?.data?.photoURL || userProfile?.profilePicture || userProfile?.photoURL || '',
    }

    return res.status(200).json({
      success: true,
      token: idToken,
      refreshToken,
      localId,
      user,
    })

  } catch (error: any) {
    console.error('Locket auth error:', error?.message || error)
    const message = error?.message || 'Có sự cố khi kết nối đến hệ thống'
    const status = error?.status || 500
    return res.status(status).json({ success: false, message })
  }
}