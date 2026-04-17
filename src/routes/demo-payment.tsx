// DEMO ONLY — delete this file and remove XENDIT_* keys from .env.local when done
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { z } from 'zod'
import { CreditCard, CheckCircle2, XCircle } from 'lucide-react'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const CreateInvoiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be > 0'),
})

type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>

// ─── Server function ─────────────────────────────────────────────────────────

const createXenditInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input) => CreateInvoiceSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ invoiceUrl: string; invoiceId: string }> => {
      const secretKey = process.env.XENDIT_SECRET_KEY
      if (!secretKey) throw new Error('XENDIT_SECRET_KEY is not configured')

      const credentials = Buffer.from(`${secretKey}:`).toString('base64')
      const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

      const payload = {
        external_id: `demo-${Date.now()}`,
        amount: data.amount,
        payer_email: data.email,
        description: data.description,
        currency: 'PHP',
        customer: {
          given_names: data.name,
          email: data.email,
          ...(data.phone ? { mobile_number: data.phone } : {}),
        },
        success_redirect_url: `${baseUrl}/demo-payment?status=success`,
        failure_redirect_url: `${baseUrl}/demo-payment?status=failed`,
      }

      const response = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = (await response.json()) as { message?: string }
        throw new Error(err.message ?? 'Failed to create Xendit invoice')
      }

      const invoice = (await response.json()) as {
        invoice_url: string
        id: string
      }
      return { invoiceUrl: invoice.invoice_url, invoiceId: invoice.id }
    },
  )

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/demo-payment')({
  validateSearch: (search: Record<string, unknown>) => ({
    status: search.status as 'success' | 'failed' | undefined,
  }),
  component: DemoPaymentPage,
})

// ─── Page component ───────────────────────────────────────────────────────────

function DemoPaymentPage() {
  const { status } = Route.useSearch()

  if (status === 'success') return <StatusScreen success />
  if (status === 'failed') return <StatusScreen success={false} />

  return <PaymentForm />
}

// ─── Form component ───────────────────────────────────────────────────────────

function PaymentForm() {
  const [fields, setFields] = useState<
    Omit<CreateInvoiceInput, 'amount'> & { amount: string }
  >({
    name: '',
    email: '',
    phone: '',
    description: '',
    amount: '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateInvoiceInput, string>>
  >({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const parsed = CreateInvoiceSchema.safeParse({
      ...fields,
      amount: fields.amount === '' ? undefined : Number(fields.amount),
    })

    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateInvoiceInput
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const result = await createXenditInvoiceFn({ data: parsed.data })
      window.location.href = result.invoiceUrl
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Something went wrong',
      )
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              Demo · Xendit Sandbox
            </p>
            <h1 className="text-xl font-black text-slate-950 dark:text-slate-50">
              Payment Demo
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit} noValidate className="grid gap-4">
            {/* Full Name */}
            <Field label="Full Name" error={errors.name}>
              <input
                value={fields.name}
                onChange={set('name')}
                placeholder="Juan dela Cruz"
                className={inputCls(!!errors.name)}
              />
            </Field>

            {/* Email */}
            <Field label="Email Address" error={errors.email}>
              <input
                type="email"
                value={fields.email}
                onChange={set('email')}
                placeholder="juan@example.com"
                className={inputCls(!!errors.email)}
              />
            </Field>

            {/* Phone */}
            <Field label="Phone Number" hint="Optional">
              <input
                type="tel"
                value={fields.phone}
                onChange={set('phone')}
                placeholder="+63 900 000 0000"
                className={inputCls(false)}
              />
            </Field>

            {/* Description */}
            <Field label="Description / Purpose" error={errors.description}>
              <textarea
                value={fields.description}
                onChange={set('description')}
                placeholder="e.g. Service fee for Q1 project"
                rows={2}
                className={inputCls(!!errors.description) + ' resize-none py-2'}
              />
            </Field>

            {/* Amount */}
            <Field label="Amount (PHP)" error={errors.amount}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  ₱
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={fields.amount}
                  onChange={set('amount')}
                  placeholder="500.00"
                  className={inputCls(!!errors.amount) + ' pl-7'}
                />
              </div>
            </Field>

            {serverError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-lg bg-teal-600 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300 dark:disabled:bg-teal-900"
            >
              {loading ? 'Creating invoice…' : 'Proceed to Payment →'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sandbox mode · No real charges · Powered by Xendit
        </p>
      </div>
    </main>
  )
}

// ─── Success / failure screen ─────────────────────────────────────────────────

function StatusScreen({ success }: { success: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {success ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
        )}
        <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-slate-50">
          {success ? 'Payment Successful' : 'Payment Failed'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {success
            ? 'Your sandbox transaction was completed.'
            : 'The payment was not completed. Please try again.'}
        </p>
        <a
          href="/demo-payment"
          className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white no-underline hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          Try again
        </a>
      </div>
    </main>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {hint && (
          <span className="text-xs font-normal text-slate-400">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  )
}

function inputCls(hasError: boolean) {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-950 outline-none transition-colors',
    'dark:bg-slate-800 dark:text-slate-50',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:focus:border-teal-500',
  ].join(' ')
}
