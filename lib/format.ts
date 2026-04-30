export function formatCurrency(value: number, fractionDigits = 2): string {
    if (isNaN(value) || !isFinite(value)) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  }
  
  export function formatNumber(value: number, fractionDigits = 2): string {
    if (isNaN(value) || !isFinite(value)) return '—'
    return new Intl.NumberFormat('en-AU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  }
  
  export function formatPercent(value: number, fractionDigits = 1): string {
    if (isNaN(value) || !isFinite(value)) return '—'
    return `${value.toFixed(fractionDigits)}%`
  }