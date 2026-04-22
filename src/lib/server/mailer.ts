import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

let cachedTransport: Transporter | null = null

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport

  const host = process.env.SMTP_HOST
  if (!host) return null

  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = String(process.env.SMTP_SECURE ?? 'false') === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })

  return cachedTransport
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? 'Flow Track <no-reply@localhost>'
}

/**
 * Send an email via the configured SMTP transport.
 *
 * If SMTP_HOST is not set (local development), the email is logged to the
 * server console instead of being sent. This keeps dev setup friction-free
 * while still exercising the end-to-end flow.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transport = getTransport()

  if (!transport) {
    console.warn(
      '[mailer] SMTP_HOST is not set — logging email instead of sending.',
    )
    console.info('[mailer] ---- Email (dev fallback) ----')
    console.info(`[mailer] To:      ${input.to}`)
    console.info(`[mailer] Subject: ${input.subject}`)
    console.info(`[mailer] Text:\n${input.text}`)
    console.info('[mailer] ---- End email ----')
    return
  }

  await transport.sendMail({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
}

export async function sendInviteEmail(params: {
  to: string
  workspaceName: string
  inviterName: string
  roleName: string
  inviteUrl: string
}): Promise<void> {
  const { to, workspaceName, inviterName, roleName, inviteUrl } = params
  const subject = `${inviterName} invited you to ${workspaceName} on Clockify Timer`
  const text = [
    `Hi,`,
    ``,
    `${inviterName} invited you to join "${workspaceName}" as ${roleName}.`,
    ``,
    `Accept the invite: ${inviteUrl}`,
    ``,
    `This link expires in 7 days. If you weren't expecting this, you can ignore it.`,
  ].join('\n')
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;font-size:20px;">You've been invited to ${escapeHtml(workspaceName)}</h2>
      <p style="margin:0 0 16px;color:#475569;line-height:1.55;">
        <strong>${escapeHtml(inviterName)}</strong> invited you to join
        <strong>${escapeHtml(workspaceName)}</strong> as <strong>${escapeHtml(roleName)}</strong>.
      </p>
      <p style="margin:24px 0;">
        <a href="${inviteUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Accept invitation</a>
      </p>
      <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Link expires in 7 days. If you weren't expecting this, ignore this email.</p>
    </div>
  `
  await sendEmail({ to, subject, text, html })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
