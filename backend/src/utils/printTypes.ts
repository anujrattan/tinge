/**
 * Qikink Print Type IDs Mapping
 * 
 * Maps print type IDs to their names for reference
 * These values are used when 'search_from_my_products' is 0 in Qikink API
 */

export const PRINT_TYPES: Record<number, string> = {
  1: "DTG",
  2: "All over Printed Products",
  3: "Embroidery",
  5: "Accessories",
  6: "Puff print",
  7: "Glow-In-Dark",
  12: "Rainbow Vinyl Printing",
  13: "Gold Vinyl Printing",
  14: "Silver Vinyl Printing",
  15: "Reflective Grey Vinyl Printing",
  17: "DTF",
};

/**
 * Get print type name by ID
 * 
 * @param id - Print type ID
 * @returns Print type name or undefined if not found
 */
export function getPrintTypeName(id: number): string | undefined {
  return PRINT_TYPES[id];
}

/**
 * Get all available print type IDs
 * 
 * @returns Array of print type IDs
 */
export function getPrintTypeIds(): number[] {
  return Object.keys(PRINT_TYPES).map(Number);
}

/**
 * Check if a print type ID is valid
 * 
 * @param id - Print type ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrintTypeId(id: number): boolean {
  return id in PRINT_TYPES;
}

