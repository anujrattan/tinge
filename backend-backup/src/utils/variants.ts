/**
 * Variant Utility Functions
 * Shared utilities for extracting and processing product variants
 */

// Size validation regex pattern
export const SIZE_PATTERN = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d+)$/i;

// Size order for sorting
export const SIZE_ORDER = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', '5xl'];

/**
 * Check if a string looks like a size
 */
export const isValidSize = (value: string): boolean => {
  return SIZE_PATTERN.test(value);
};

/**
 * Sort sizes in a logical order
 */
export const sortSizes = (sizes: string[]): string[] => {
  return sizes.sort((a, b) => {
    const aIndex = SIZE_ORDER.findIndex(s => a.toLowerCase() === s);
    const bIndex = SIZE_ORDER.findIndex(s => b.toLowerCase() === s);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
};

/**
 * Extract sizes and colors from Gelato template variants
 * @param variants - Array of variants from Gelato template response
 * @returns Object with sizes and colors arrays
 */
export const extractSizesAndColors = (variants: any[]): { sizes: string[]; colors: string[] } => {
  const sizes = new Set<string>();
  const colors = new Set<string>();

  variants.forEach((variant) => {
    let sizeFound = false;
    let colorFound = false;

    // First priority: Extract from variantOptions (most reliable)
    if (variant.variantOptions && Array.isArray(variant.variantOptions)) {
      variant.variantOptions.forEach((option: any) => {
        const optionName = (option.name || '').toLowerCase();
        const optionValue = (option.value || '').trim();

        if (optionName === 'size' && optionValue) {
          sizes.add(optionValue);
          sizeFound = true;
        }
        if ((optionName === 'color' || optionName === 'colour') && optionValue) {
          colors.add(optionValue);
          colorFound = true;
        }
      });
    }

    // Fallback: Extract from title if not found in variantOptions
    // Format: "White - L - DTG" or "Black - XL - Embroidery"
    if (variant.title) {
      const parts = variant.title.split(' - ').map((p: string) => p.trim());
      
      // If size not found in variantOptions, try to extract from title
      if (!sizeFound && parts.length >= 2) {
        // Second part is usually size (e.g., "L", "XL", "2XL")
        const possibleSize = parts[1];
        // Validate it looks like a size (contains common size patterns)
        if (isValidSize(possibleSize)) {
          sizes.add(possibleSize);
        }
      }

      // If color not found in variantOptions, try to extract from title
      if (!colorFound && parts.length >= 1) {
        // First part is usually color (e.g., "White", "Black", "Navy Blue")
        const possibleColor = parts[0];
        // Only add if it doesn't look like a size
        if (!isValidSize(possibleColor)) {
          colors.add(possibleColor);
        }
      }
    }
  });

  return {
    sizes: sortSizes(Array.from(sizes)),
    colors: Array.from(colors).sort(),
  };
};

