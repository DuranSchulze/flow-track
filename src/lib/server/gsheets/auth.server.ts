import { google, type sheets_v4 } from 'googleapis'

type ServiceAccountJson = {
  client_email: string
  private_key: string
}

let cachedCreds: ServiceAccountJson | null = null
let cachedClient: sheets_v4.Sheets | null = null

function loadCredentials(): ServiceAccountJson {
  if (cachedCreds) return cachedCreds

  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error(
      'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON env var is not set. ' +
        'Paste the full service-account JSON (single-line) into .env.local.',
    )
  }

  let parsed: ServiceAccountJson
  try {
    parsed = JSON.parse(raw) as ServiceAccountJson
  } catch {
    throw new Error(
      'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON is not valid JSON.',
    )
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'Service-account JSON is missing client_email or private_key.',
    )
  }

  // Common gotcha: env var stripped escaped newlines from the private key.
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')

  cachedCreds = parsed
  return parsed
}

export function getServiceAccountEmail(): string {
  return loadCredentials().client_email
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient

  const creds = loadCredentials()
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  cachedClient = google.sheets({ version: 'v4', auth })
  return cachedClient
}
