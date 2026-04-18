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
