/**
 * Transform BaZi element names to simplified format
 * Yin Fire → Fire-I, Yang Fire → Fire-O
 */
export function transformElementName(element: string, yinYang?: string): string {
  const elementMap: Record<string, string> = {
    WOOD: 'Wood',
    FIRE: 'Fire',
    EARTH: 'Earth',
    METAL: 'Metal',
    WATER: 'Water',
  };

  // Normalize element name
  const normalizedElement = element.toUpperCase();
  const elementName = elementMap[normalizedElement] || element;

  // Transform Yin/Yang to I/O
  if (yinYang) {
    const polarity = yinYang.toUpperCase() === 'YIN' ? 'I' : 'O';
    return `${elementName}-${polarity}`;
  }

  return elementName;
}

/**
 * Transform element names in text content
 * Replaces patterns like "Yin Fire" → "Fire-I", "Yang Fire" → "Fire-O"
 */
export function transformElementNamesInText(text: string): string {
  const patterns = [
    { yin: /Yin\s+Wood/gi, yang: /Yang\s+Wood/gi, element: 'Wood' },
    { yin: /Yin\s+Fire/gi, yang: /Yang\s+Fire/gi, element: 'Fire' },
    { yin: /Yin\s+Earth/gi, yang: /Yang\s+Earth/gi, element: 'Earth' },
    { yin: /Yin\s+Metal/gi, yang: /Yang\s+Metal/gi, element: 'Metal' },
    { yin: /Yin\s+Water/gi, yang: /Yang\s+Water/gi, element: 'Water' },
  ];

  let transformed = text;

  for (const pattern of patterns) {
    transformed = transformed.replace(pattern.yin, `${pattern.element}-I`);
    transformed = transformed.replace(pattern.yang, `${pattern.element}-O`);
  }

  return transformed;
}

