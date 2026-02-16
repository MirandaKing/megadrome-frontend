/**
 * Format a number with commas and specified decimals
 */
export function formatAmount(value: string | number | bigint, decimals = 4): string {
  const num = typeof value === "bigint" ? Number(value) : Number(value);
  if (isNaN(num)) return "0";
  if (num === 0) return "0";
  
  // For very small numbers, show more decimals
  if (num < 0.0001 && num > 0) {
    return num.toExponential(2);
  }
  
  // Format with commas
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a number as USD currency
 */
export function formatUSD(value: string | number): string {
  const num = Number(value);
  if (isNaN(num)) return "$0.00";
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: string | number, decimals = 2): string {
  const num = Number(value);
  if (isNaN(num)) return "0%";
  
  return `${num.toFixed(decimals)}%`;
}

/**
 * Shorten an Ethereum address
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format seconds into human readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  
  return parts.join(" ") || "0m";
}

/**
 * Format token amount from bigint with decimals
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  if (!amount) return "0";
  
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  // Convert fractional part to string with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const truncatedFractional = fractionalStr.slice(0, displayDecimals);
  
  // Remove trailing zeros
  const cleanFractional = truncatedFractional.replace(/0+$/, "");
  
  if (cleanFractional) {
    return `${formatAmount(integerPart)}.${cleanFractional}`;
  }
  return formatAmount(integerPart);
}

/**
 * Parse amount string to bigint with decimals
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  if (!amount || amount === "") return BigInt(0);
  
  const [integerPart, fractionalPart = ""] = amount.split(".");
  const paddedFractional = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = `${integerPart}${paddedFractional}`;
  
  return BigInt(combined);
}
