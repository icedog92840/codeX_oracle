// formatCurrency renders compact dollar values for metric cards and table cells.
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

// formatSignedCurrency renders positive values with a leading plus sign.
export function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

// formatPercent renders decimal percentages such as 0.125 as 12.50%.
export function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

// formatSignedPercent renders positive percentage values with a leading plus sign.
export function formatSignedPercent(value: number) {
  const formatted = formatPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

// formatShares keeps share quantities dense while preserving two decimal places.
export function formatShares(value: number) {
  return value.toFixed(2);
}
