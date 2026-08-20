import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyCcEi3Yt_oGlU_AZu4qQ7YEfICFZljdRDY',
  authDomain: 'carshare-195f9.firebaseapp.com',
  projectId: 'carshare-195f9',
  storageBucket: 'carshare-195f9.firebasestorage.app',
  messagingSenderId: '256324801326',
  appId: '1:256324801326:web:c1be00e64d954aaeb260bf'
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);

/**
 * Firebase Phone Authentication Configuration
 * 
 * SETUP CHECKLIST:
 * 
 * 1. Firebase Console > carshare-195f9
 * 2. Go to Authentication > Sign-in method
 * 3. Enable "Phone" authentication method
 * 4. Save & Review
 * 
 * 5. Configure Test Phone Numbers (for development):
 *    - In Firebase Console > Authentication > Settings
 *    - Add test numbers like +919876543210
 *    - Set OTP as 123456 (or any value)
 * 
 * 6. Configure reCAPTCHA:
 *    - Firebase automatically handles reCAPTCHA v3
 *    - No additional configuration needed
 *    - reCAPTCHA is invisible by default
 * 
 * 7. Domain Authorization:
 *    - Firebase Console > Authentication > Settings
 *    - Go to "Authorized Domains"
 *    - Add your domain:
 *      * Development: localhost:4200
 *      * Production: your-domain.com
 * 
 * 8. Security Rules (if using Firestore):
 *    - Users can only read/write their own documents
 * 
 * IMPORTANT:
 * - Phone authentication uses OTP sent via SMS
 * - Each OTP is valid for 3 minutes
 * - User can retry up to 5 times before temporary lockout
 * - Firebase handles all OTP generation and validation
 * - App only needs to verify OTP client-side
 * 
 * TEST CREDENTIALS (Development):
 * - Phone: +919876543210
 * - OTP: 123456 (or configured in Firebase Console)
 */

export const PHONE_AUTH_CONFIG = {
  /**
   * OTP expiry time in milliseconds (3 minutes)
   * Firebase default: 3 minutes
   */
  OTP_EXPIRY_TIME_MS: 3 * 60 * 1000,

  /**
   * OTP length in digits
   * Firebase default: 6 digits
   */
  OTP_LENGTH: 6,

  /**
   * Maximum number of retry attempts
   */
  MAX_RETRY_ATTEMPTS: 5,

  /**
   * Timeout for reCAPTCHA verification in milliseconds
   */
  RECAPTCHA_TIMEOUT_MS: 60 * 1000,

  /**
   * Production flag
   */
  PRODUCTION: false, // Set to true for production
};

/**
 * Development/Testing Notes:
 * 
 * 1. Test Phone Numbers:
 *    Add in Firebase Console > Authentication > Phone tab
 *    - These are free and don't consume SMS quota
 *    - OTP you set is always accepted
 * 
 * 2. Emulator Setup (for local development):
 *    - Install Firebase CLI: npm install -g firebase-tools
 *    - firebase emulators:start --only auth
 *    - Update firebaseConfig to use localhost:9099
 * 
 * 3. Common Issues:
 *    - "reCAPTCHA error: reCAPTCHA container is not started yet"
 *      → Ensure reCAPTCHA element is mounted before calling signInWithPhoneNumber
 *    - "Timeout"
 *      → Network issue or reCAPTCHA taking too long
 *    - "Provider not available"
 *      → Phone auth not enabled in Firebase Console
 * 
 * 4. Debugging:
 *    - Enable Firebase debug mode: getAuth().useEmulator('localhost', 9099);
 *    - Check browser console for detailed error messages
 *    - Check Firebase Console > Logs for server-side issues
 */
