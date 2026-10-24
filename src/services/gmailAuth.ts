import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse initialized Firebase app if it exists
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.compose');
provider.addScope('https://www.googleapis.com/auth/gmail.send');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không thể lấy mã truy cập từ Firebase Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Encode email message in Base64URL compliant with RFC 2822
function buildBase64UrlEmail(to: string, subject: string, htmlBody: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    to ? `To: ${to}` : '',
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    htmlBody,
  ].filter(line => line !== '');

  const rawMessage = messageParts.join('\r\n');
  return btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Create real Draft in user's Gmail
export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
) {
  const raw = buildBase64UrlEmail(to, subject, htmlBody);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Không thể tạo thư nháp trong Gmail.');
  }

  return await response.json();
}

// Send real Email via Gmail API (requires explicit user confirmation dialog in UI)
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
) {
  const raw = buildBase64UrlEmail(to, subject, htmlBody);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Không thể gửi email qua Gmail.');
  }

  return await response.json();
}

// Copy rich HTML to clipboard & open real Gmail Compose tab
export async function openInRealGmailTab(
  subject: string,
  bodyText: string,
  bodyHtml: string
) {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const typeHtml = 'text/html';
      const typeText = 'text/plain';
      const blobHtml = new Blob([bodyHtml], { type: typeHtml });
      const blobText = new Blob([bodyText], { type: typeText });
      const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typeText]: blobText })];
      await navigator.clipboard.write(data);
    } else {
      await navigator.clipboard.writeText(bodyText);
    }
  } catch (err) {
    console.warn('Clipboard write fallback:', err);
    await navigator.clipboard.writeText(bodyText).catch(() => {});
  }

  // Open Gmail web compose in a new tab
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyText)}`;
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
}
