export const LIFE_AREAS = {
  year: 'social',
  month: 'career',
  day: 'personal',
  hour: 'innovation',
} as const;

export const INTERACTION_WEIGHTS: Record<string, number> = {
  BranchClash: 50,
  BranchPunishment: 30,
  BranchHarm: 15,
  StemClash: 20,
  TrinityCombo: 15,
  Branch6Combo: 10,
  StemCombination: 10,
};

// Authentic Metadata for Elements
export const ELEMENT_META: Record<string, { cn: string; pinyin: string }> = {
  WOOD: { cn: '木', pinyin: 'Mù' },
  FIRE: { cn: '火', pinyin: 'Huǒ' },
  EARTH: { cn: '土', pinyin: 'Tǔ' },
  METAL: { cn: '金', pinyin: 'Jīn' },
  WATER: { cn: '水', pinyin: 'Shuǐ' },
};

// Authentic Metadata for Ten Gods
export const TEN_GOD_META: Record<
  string,
  { cn: string; pinyin: string; description: string }
> = {
  Friend: {
    cn: '比肩',
    pinyin: 'Bǐ Jiān',
    description: 'Self (Same Polarity)',
  },
  'Rob Wealth': {
    cn: '劫財',
    pinyin: 'Jié Cái',
    description: 'Self (Opposite Polarity)',
  },
  'Eating God': {
    cn: '食神',
    pinyin: 'Shí Shén',
    description: 'Output (Same Polarity)',
  },
  'Hurting Officer': {
    cn: '傷官',
    pinyin: 'Shāng Guān',
    description: 'Output (Opposite Polarity)',
  },
  'Direct Wealth': {
    cn: '正財',
    pinyin: 'Zhèng Cái',
    description: 'Control (Opposite Polarity)',
  },
  'Indirect Wealth': {
    cn: '偏財',
    pinyin: 'Piān Cái',
    description: 'Control (Same Polarity)',
  },
  'Direct Officer': {
    cn: '正官',
    pinyin: 'Zhèng Guān',
    description: 'Power (Opposite Polarity)',
  },
  '7 Killings': {
    cn: '七殺',
    pinyin: 'Qī Shā',
    description: 'Power (Same Polarity)',
  },
  'Direct Resource': {
    cn: '正印',
    pinyin: 'Zhèng Yìn',
    description: 'Resource (Opposite Polarity)',
  },
  'Indirect Resource': {
    cn: '偏印',
    pinyin: 'Piān Yìn',
    description: 'Resource (Same Polarity)',
  },
};
