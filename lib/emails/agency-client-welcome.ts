// lib/emails/agency-client-welcome.ts
// Uses the existing sendEmail() from lib/email.ts — no direct Resend import needed

import { sendEmail } from '@/lib/email';

interface SendAgencyClientWelcomeProps {
  to: string;
  firstName: string;
  lastName: string;
  agencyName: string;
  planName: string;
  tempPassword: string;
  loginUrl: string;
  supportEmail?: string;
  primaryColor?: string;
}

export async function sendAgencyClientWelcomeEmail(props: SendAgencyClientWelcomeProps): Promise<void> {
  const {
    to,
    firstName,
    agencyName,
    planName,
    tempPassword,
    loginUrl,
    supportEmail,
    primaryColor = '#1e3a5f',
  } = props;

  // Dev redirect handled inside sendEmail() via DEV_EMAIL_OVERRIDE
  await sendEmail({
    to,
    subject: `Welcome to ${agencyName} — Your account is ready`,
    html: buildHtml({ ...props, primaryColor }),
    text: buildText({ firstName, agencyName, planName, tempPassword, loginUrl, supportEmail, actualEmail: to }),
  });
}

// ── Plain text ─────────────────────────────────────────────────────────────
function buildText(p: {
  firstName: string;
  agencyName: string;
  planName: string;
  tempPassword: string;
  loginUrl: string;
  supportEmail?: string;
  actualEmail: string;
}) {
  return `
Hi ${p.firstName},

Welcome to ${p.agencyName}! Your account has been set up on the ${p.planName} plan.

YOUR LOGIN CREDENTIALS
──────────────────────
Email:    ${p.actualEmail}
Password: ${p.tempPassword}

LOGIN HERE: ${p.loginUrl}

Please change your password immediately after your first login.

${p.supportEmail ? `Questions? Contact us at ${p.supportEmail}` : ''}

Thanks,
The ${p.agencyName} Team
`.trim();
}

// ── HTML ───────────────────────────────────────────────────────────────────
function buildHtml(p: SendAgencyClientWelcomeProps & { primaryColor: string }) {
  const { firstName, agencyName, planName, tempPassword, loginUrl, supportEmail, primaryColor, to } = p;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${agencyName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:${primaryColor};border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${agencyName}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Your account is ready</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Welcome to <strong>${agencyName}</strong>! Your account has been created on the
                <strong>${planName}</strong> plan. Use the credentials below to log in.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">
                      Your Login Credentials
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#6b7280;width:90px;">Email</td>
                        <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#6b7280;">Password</td>
                        <td style="padding:6px 0;">
                          <code style="font-size:14px;font-family:'Courier New',monospace;color:#111827;background:#e5e7eb;padding:3px 8px;border-radius:4px;font-weight:600;">${tempPassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;">
                      Log In to Your Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#92400e;">
                    ⚠️ <strong>Please change your password</strong> after your first login for security.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                ${supportEmail
                  ? `Questions? Contact us at <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">${supportEmail}</a>.`
                  : 'If you have questions, please reach out to your account manager.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This email was sent by ${agencyName}. If you didn't expect this, you can ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}