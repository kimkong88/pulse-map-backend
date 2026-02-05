import { ElementType } from '@aharris02/bazi-calculator-by-alvamind';

/**
 * Emoji mapping for elements
 */
export const ELEMENT_EMOJIS: Record<ElementType, string> = {
  WOOD: '🌳',
  FIRE: '🔥',
  EARTH: '⛰️',
  METAL: '⚔️',
  WATER: '💧',
};

/**
 * Get emoji for an element
 */
export function getElementEmoji(element: ElementType): string {
  return ELEMENT_EMOJIS[element] || '✨';
}
