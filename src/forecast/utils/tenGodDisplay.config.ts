/**
 * Ten God Display Names and Emojis
 * Two-tier approach: Display names for UI, technical names for accuracy
 */

export const TEN_GOD_DISPLAY_NAMES: Record<string, string> = {
  // Power/Authority
  'Direct Officer': 'Authority',
  '7 Killings': 'Dynamic Power',
  'Qi Sha': 'Dynamic Power', // Pinyin variant

  // Wealth
  'Direct Wealth': 'Stable Income',
  'Indirect Wealth': 'Opportunity',
  'Zheng Cai': 'Stable Income', // Pinyin variant
  'Pian Cai': 'Opportunity', // Pinyin variant

  // Output/Creativity
  'Eating God': 'Creative Flow',
  'Hurting Officer': 'Sharp Expression',
  'Shi Shen': 'Creative Flow', // Pinyin variant
  'Shang Guan': 'Sharp Expression', // Pinyin variant

  // Resource/Support
  'Direct Resource': 'Guidance',
  'Indirect Resource': 'Intuition',
  'Zheng Yin': 'Guidance', // Pinyin variant
  'Pian Yin': 'Intuition', // Pinyin variant

  // Self/Partnership
  'Friend': 'Partnership',
  'Rob Wealth': 'Independence',
  'Bi Jian': 'Partnership', // Pinyin variant
  'Jie Cai': 'Independence', // Pinyin variant
};

export const TEN_GOD_EMOJIS: Record<string, string> = {
  'Direct Officer': '👔',
  '7 Killings': '⚔️',
  'Qi Sha': '⚔️',
  'Direct Wealth': '💰',
  'Indirect Wealth': '💸',
  'Zheng Cai': '💰',
  'Pian Cai': '💸',
  'Eating God': '🎨',
  'Hurting Officer': '✍️',
  'Shi Shen': '🎨',
  'Shang Guan': '✍️',
  'Direct Resource': '📚',
  'Indirect Resource': '🔮',
  'Zheng Yin': '📚',
  'Pian Yin': '🔮',
  'Friend': '🤝',
  'Rob Wealth': '⚡',
  'Bi Jian': '🤝',
  'Jie Cai': '⚡',
};

export const TEN_GOD_CATEGORIES: Record<string, 'power' | 'wealth' | 'output' | 'resource' | 'friend'> = {
  'Direct Officer': 'power',
  '7 Killings': 'power',
  'Qi Sha': 'power',
  'Direct Wealth': 'wealth',
  'Indirect Wealth': 'wealth',
  'Zheng Cai': 'wealth',
  'Pian Cai': 'wealth',
  'Eating God': 'output',
  'Hurting Officer': 'output',
  'Shi Shen': 'output',
  'Shang Guan': 'output',
  'Direct Resource': 'resource',
  'Indirect Resource': 'resource',
  'Zheng Yin': 'resource',
  'Pian Yin': 'resource',
  'Friend': 'friend',
  'Rob Wealth': 'friend',
  'Bi Jian': 'friend',
  'Jie Cai': 'friend',
};

/**
 * Get display name for a Ten God (technical name)
 */
export function getTenGodDisplayName(technicalName: string | null): string | null {
  if (!technicalName) return null;
  return TEN_GOD_DISPLAY_NAMES[technicalName] || technicalName;
}

/**
 * Get emoji for a Ten God (technical name)
 */
export function getTenGodEmoji(technicalName: string | null): string | null {
  if (!technicalName) return null;
  return TEN_GOD_EMOJIS[technicalName] || '✨';
}

/**
 * Get category for a Ten God (technical name)
 */
export function getTenGodCategory(technicalName: string | null): 'power' | 'wealth' | 'output' | 'resource' | 'friend' | null {
  if (!technicalName) return null;
  return TEN_GOD_CATEGORIES[technicalName] || null;
}
