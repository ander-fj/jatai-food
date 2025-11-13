/**
 * Safely formats a value as currency with proper error handling
 * @param value - The value to format (can be number, string, null, undefined, NaN, Infinity)
 * @param defaultValue - The default value to use if the input is invalid (default: 0)
 * @returns Formatted currency string with 2 decimal places
 */
export const formatCurrency = (value: any, defaultValue: number = 0): string => {
  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return defaultValue.toFixed(2);
  }

  // Convert to number
  const numValue = Number(value);

  // Handle NaN, Infinity, or -Infinity
  if (!Number.isFinite(numValue)) {
    return defaultValue.toFixed(2);
  }

  // Return formatted value
  return numValue.toFixed(2);
};

/**
 * Safely formats a percentage value
 * @param value - The value to format as percentage
 * @param defaultValue - The default value to use if the input is invalid (default: 0)
 * @returns Formatted percentage string with 1 decimal place
 */
export const formatPercentage = (value: any, defaultValue: number = 0): string => {
  if (value === null || value === undefined || value === '') {
    return `${defaultValue.toFixed(1)}%`;
  }

  const numValue = Number(value);

  if (!Number.isFinite(numValue)) {
    return `${defaultValue.toFixed(1)}%`;
  }

  return `${numValue.toFixed(1)}%`;
};

/**
 * Safely formats a number with specified decimal places
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @param defaultValue - The default value to use if the input is invalid (default: 0)
 * @returns Formatted number string
 */
export const formatNumber = (value: any, decimals: number = 2, defaultValue: number = 0): string => {
  if (value === null || value === undefined || value === '') {
    return defaultValue.toFixed(decimals);
  }

  const numValue = Number(value);

  if (!Number.isFinite(numValue)) {
    return defaultValue.toFixed(decimals);
  }

  return numValue.toFixed(decimals);
};