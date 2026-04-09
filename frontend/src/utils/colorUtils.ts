/**
 * Color utility functions for handling hex codes and color names
 */

interface ColorMapping {
  name: string;
  hex: string;
  aliases?: string[];
}

export interface ColorProfile {
  name: string;
  hex: string;
}

// Runtime-loaded canonical profiles from backend (DB + Redis cached).
// These override the static COLOR_MAP when present.
let DYNAMIC_COLOR_PROFILES: Map<string, string> | null = null;

export const setDynamicColorProfiles = (profiles: ColorProfile[]) => {
  const map = new Map<string, string>();
  for (const p of profiles || []) {
    const name = String(p?.name || '').trim();
    const hex = String(p?.hex || '').trim().toUpperCase();
    if (!name) continue;
    if (!/^#[0-9A-F]{6}$/.test(hex)) continue;
    map.set(name.toLowerCase(), hex);
  }
  DYNAMIC_COLOR_PROFILES = map;
};

// Common color mappings
const COLOR_MAP: ColorMapping[] = [
  { name: 'Black', hex: '#000000', aliases: ['#000', '#1a1a1a', '#0f172a'] },
  { name: 'White', hex: '#FFFFFF', aliases: ['#fff', '#f8f9fa', '#ffffff', '#fafafa', '#f5f5f5'] },
  { name: 'Gray', hex: '#808080', aliases: ['#6b7280', '#9ca3af', '#d1d5db', '#374151', '#e5e7eb', '#e3e3e3', '#d4d4d4', '#a3a3a3', '#737373', '#525252'] },
  { name: 'Navy', hex: '#001f3f', aliases: ['#1e3a8a', '#1e40af', '#3b82f6'] },
  { name: 'Blue', hex: '#0074D9', aliases: ['#2563eb', '#3b82f6', '#60a5fa'] },
  { name: 'Teal', hex: '#39CCCC', aliases: ['#14b8a6', '#2dd4bf', '#5eead4', '#0d9488'] },
  { name: 'Green', hex: '#2ECC40', aliases: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857'] },
  { name: 'Lime', hex: '#01FF70', aliases: ['#84cc16', '#a3e635', '#bef264'] },
  { name: 'Yellow', hex: '#FFDC00', aliases: ['#eab308', '#fbbf24', '#fcd34d'] },
  { name: 'Orange', hex: '#FF851B', aliases: ['#f97316', '#fb923c', '#fdba74', '#ea580c'] },
  { name: 'Red', hex: '#FF4136', aliases: ['#ef4444', '#f87171', '#fca5a5', '#dc2626'] },
  { name: 'Pink', hex: '#F012BE', aliases: ['#ec4899', '#f472b6', '#f9a8d4', '#be185d'] },
  { name: 'Purple', hex: '#B10DC9', aliases: ['#a855f7', '#c084fc', '#e9d5ff', '#7c3aed', '#8b5cf6'] },
  { name: 'Maroon', hex: '#85144b', aliases: ['#881337', '#9f1239'] },
  { name: 'Olive', hex: '#3D9970', aliases: ['#65a30d', '#84cc16'] },
  { name: 'Aqua', hex: '#7FDBFF', aliases: ['#06b6d4', '#22d3ee', '#67e8f9'] },
  { name: 'Brown', hex: '#8B4513', aliases: ['#92400e', '#b45309', '#d97706'] },
  { name: 'Beige', hex: '#F5F5DC', aliases: ['#fef3c7', '#fde68a'] },
  { name: 'Coral', hex: '#FF7F50', aliases: ['#f472b6', '#fb7185'] },
  { name: 'Mint', hex: '#98FF98', aliases: ['#86efac', '#bbf7d0'] },
  { name: 'Lavender', hex: '#E6E6FA', aliases: ['#ddd6fe', '#e9d5ff'] },
  { name: 'Lavendar', hex: '#E6E6FA' }, // common typo → same as Lavender
  { name: 'Sage', hex: '#BCB88A', aliases: ['#a7f3d0', '#6ee7b7'] },
  { name: 'Emerald', hex: '#50C878', aliases: ['#10b981', '#34d399', '#15803d'] },
  { name: 'Forest', hex: '#228B22', aliases: ['#166534', '#14532d'] },
  { name: 'Charcoal', hex: '#36454F', aliases: ['#374151', '#1f2937'] },
];

/**
 * Convert hex color code to readable color name
 * @param color - hex code or color name
 * @returns readable color name
 */
export const getColorName = (color: string): string => {
  if (!color) return 'Unknown';
  
  // If it's already a color name (doesn't start with #), return as is
  if (!color.startsWith('#')) {
    return color.charAt(0).toUpperCase() + color.slice(1);
  }
  
  const normalizedHex = color.toLowerCase();
  
  // Find exact match or alias match
  for (const mapping of COLOR_MAP) {
    if (
      mapping.hex.toLowerCase() === normalizedHex ||
      mapping.aliases?.some(alias => alias.toLowerCase() === normalizedHex)
    ) {
      return mapping.name;
    }
  }
  
  // If no match found, use basic RGB analysis
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgb = hexToRgb(color);
  if (!rgb) return 'Custom';
  
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  
  // Very dark = Black
  if (lightness < 30) return 'Black';
  
  // Very light = White
  if (lightness > 225) return 'White';
  
  // Gray (low saturation)
  if (max - min < 30) return 'Gray';
  
  // Determine hue-based color
  if (r > g && r > b) {
    if (g > b * 1.5) return 'Orange';
    return 'Red';
  }
  if (g > r && g > b) {
    if (b > r) return 'Teal';
    if (r > b * 1.5) return 'Yellow';
    return 'Green';
  }
  if (b > r && b > g) {
    if (r > g) return 'Purple';
    return 'Blue';
  }
  
  return 'Custom';
};

/**
 * Get the actual hex color to display (for swatches)
 * @param color - hex code or color name
 * @returns hex code for display
 */
export const getColorHex = (color: string): string => {
  if (!color) return '#808080'; // Default gray
  
  // If it's already a hex code, return it
  if (color.startsWith('#')) {
    return color;
  }

  // Prefer canonical profiles loaded from backend if available
  if (DYNAMIC_COLOR_PROFILES) {
    const dynamic = DYNAMIC_COLOR_PROFILES.get(color.toLowerCase());
    if (dynamic) return dynamic;
  }
  
  // Try to find the color name in our mapping
  const mapping = COLOR_MAP.find(
    m => m.name.toLowerCase() === color.toLowerCase()
  );
  
  return mapping ? mapping.hex : '#808080';
};

/**
 * Check if a color is dark (for text contrast)
 * @param hex - hex color code
 * @returns true if color is dark
 */
export const isColorDark = (hex: string): boolean => {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness < 128;
};

/**
 * Get CSS color value for display (alias for getColorHex)
 * @param color - hex code or color name
 * @returns CSS-ready color value
 */
export const getCssColorValue = (color: string): string => {
  return getColorHex(color);
};

/**
 * Format color input for consistency
 * Converts color names to title case and validates hex codes
 * @param color - color string (hex code or name)
 * @returns formatted color string
 */
export const formatColorInput = (color: string): string => {
  if (!color) return '';
  
  const trimmed = color.trim();
  
  // If it's a hex code, validate and return uppercase
  if (trimmed.startsWith('#')) {
    const hex = trimmed.toUpperCase();
    // Validate hex format (3 or 6 digits)
    if (/^#[0-9A-F]{3}$|^#[0-9A-F]{6}$/i.test(hex)) {
      return hex;
    }
    return trimmed; // Return as-is if invalid format
  }
  
  // Otherwise, treat as color name - convert to title case
  return trimmed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
