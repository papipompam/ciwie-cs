const FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/

export function neutralizeSpreadsheetFormula(value: unknown): string {
  const normalized = value == null ? '' : String(value)
  return FORMULA_PREFIX.test(normalized) ? `'${normalized}` : normalized
}

export function encodeCsvRow(values: readonly unknown[]): string {
  return values.map((value) => {
    const safe = neutralizeSpreadsheetFormula(value)
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
  }).join(',')
}
