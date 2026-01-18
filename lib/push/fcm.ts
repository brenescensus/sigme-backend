// Firebase Cloud Messaging for Android/iOS
// 

import jwt from 'jsonwebtoken';

interface FCMServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

export async function sendFCMNotification(
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    image?: string;
    url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.log('[FCM] Service account not configured');
      return { success: false, error: 'FCM not configured' };
    }

    const serviceAccount: FCMServiceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getFCMAccessToken(serviceAccount);

    if (!accessToken) {
      return { success: false, error: 'Failed to get FCM access token' };
    }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: {
              title: notification.title,
              body: notification.body,
              image: notification.image,
            },
            android: {
              priority: 'high',
              notification: {
                click_action: notification.url || 'OPEN_APP',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  'content-available': 1,
                },
              },
            },
            data: {
              url: notification.url || '',
              click_action: notification.url || '',
            },
          },
        }),
      }
    );

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    console.error('[FCM] Error response:', response.status, errorText);

    if (errorText.includes('UNREGISTERED') || errorText.includes('NOT_FOUND')) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }

    return {
      success: false,
      error: `FCM error: ${response.status} - ${errorText}`,
    };
  } catch (error: any) {
    console.error('[FCM] Exception:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getFCMAccessToken(serviceAccount: FCMServiceAccount): Promise<string | null> {
  // Return cached token if still valid
  if (cachedAccessToken && tokenExpiry > Date.now()) {
    return cachedAccessToken;
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Create JWT
    const jwtToken = jwt.sign(
      {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600, // 1 hour
      },
      serviceAccount.private_key,
      { algorithm: 'RS256' }
    );

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FCM] Token exchange failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 min early

    return cachedAccessToken;
  } catch (error) {
    console.error('[FCM] Get access token error:', error);
    return null;
  }
}
