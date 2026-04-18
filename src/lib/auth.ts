import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from '#/db'
import { sendEmail } from '#/lib/server/mailer'
import { renderResetPasswordEmail } from '#/lib/server/email-templates/reset-password'

const RESET_PASSWORD_EXPIRES_IN_SECONDS = 60 * 15

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : []),
  ],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_EXPIRES_IN_SECONDS,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = renderResetPasswordEmail({
        name: user.name,
        url,
        expiresInMinutes: RESET_PASSWORD_EXPIRES_IN_SECONDS / 60,
      })
      await sendEmail({ to: user.email, subject, html, text })
    },
  },
  advanced: {
    database: {
      generateId: () => {
        const bytes = new Uint8Array(12)
        crypto.getRandomValues(bytes)
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      },
    },
  },
  plugins: [tanstackStartCookies()],
})
