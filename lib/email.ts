// lib/email.ts

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // ── Resend ───────────────────────────────────────────────────────────────
  // RESEND_API_KEY  = re_xxxx        (required)
  // EMAIL_FROM      = noreply@yourverifieddomain.com  (required for production)
  //
  // During development / before domain verification, Resend only allows:
  //   FROM: onboarding@resend.dev
  //   TO:   the email address that OWNS your Resend account
  // Once your domain is verified in Resend dashboard, change EMAIL_FROM.

  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY is not set — email NOT sent to:', payload.to);
    console.log('[Email] Subject:', payload.subject);
    console.log('[Email] Body:\n', payload.text.slice(0, 400));
    return;
  }

  // require() is more reliable than dynamic import() in Next.js API routes
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    payload.from ??
    process.env.EMAIL_FROM ??
    'onboarding@resend.dev'; // safe default while domain is unverified

  console.log('[Email] Attempting Resend send...', {
    from,
    to: payload.to,
    subject: payload.subject,
  });

  const { data, error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {}),
  });

  if (error) {
    console.error('[Email] Resend rejected the request:');
    console.error(JSON.stringify(error, null, 2));
    throw new Error(
      `Resend error: ${error.name ?? 'unknown'} — ${error.message ?? JSON.stringify(error)}`
    );
  }

  console.log('[Email] Sent via Resend. ID:', data?.id, '->', payload.to);
}