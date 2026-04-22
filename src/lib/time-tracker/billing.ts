export function computeEffectiveRate(
  memberRate: number | null | undefined,
  defaultRate: number,
): number {
  if (memberRate == null) return defaultRate
  return memberRate
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function computeBillableEarnings(
  billableSeconds: number,
  effectiveRate: number,
): number {
  return (billableSeconds / 3600) * effectiveRate
}
