/**
 * Technical Basis explanations for "Why?" modal
 * Explains Bazi theory behind personality types
 */

export interface TechnicalBasisData {
  dayMaster: {
    character: string;
    displayName: string;
    metaphor: string;
    explanation: string;
  };
  dayBranch: {
    character: string;
    displayName: string;
    explanation: string;
  };
  general: string;
}

/**
 * Day Master (日主) explanations - 10 stems
 */
export const DAY_MASTER_EXPLANATIONS: Record<string, any> = {
  甲: {
    character: '甲',
    element: 'Wood',
    polarity: 'Yang',
    displayName: 'Yang Wood (甲木)',
    metaphor: 'Towering oak',
    explanation:
      'Yang Wood (甲木) represents strong, upward-reaching growth—like a tall tree that stands firm and visible. This manifests as pioneering energy, direct ambition, and a natural tendency to lead and initiate. You grow by moving forward and upward, not by adapting or bending.',
  },

  乙: {
    character: '乙',
    element: 'Wood',
    polarity: 'Yin',
    displayName: 'Yin Wood (乙木)',
    metaphor: 'Climbing vine',
    explanation:
      'Yin Wood (乙木) represents flexible, adaptive growth—like a vine that finds its way around obstacles. This manifests as diplomatic energy, strategic flexibility, and a natural ability to adapt while maintaining your direction. You grow by flowing around resistance, not confronting it directly.',
  },

  丙: {
    character: '丙',
    element: 'Fire',
    polarity: 'Yang',
    displayName: 'Yang Fire (丙火)',
    metaphor: 'Blazing sun',
    explanation:
      'Yang Fire (丙火) represents radiant, outward-directed heat—like the sun that illuminates and energizes everything it touches. This manifests as expressive energy, natural charisma, and the ability to inspire and mobilize others. Your energy radiates outward, touching many things and people at once.',
  },

  丁: {
    character: '丁',
    element: 'Fire',
    polarity: 'Yin',
    displayName: 'Yin Fire (丁火)',
    metaphor: 'Focused flame',
    explanation:
      'Yin Fire (丁火) represents concentrated, inward-burning heat—like a candle flame that focuses all its energy on a single point. This manifests as intense focus, transformative depth, and the ability to refine things to their essence. Your energy burns inward, creating depth rather than breadth.',
  },

  戊: {
    character: '戊',
    element: 'Earth',
    polarity: 'Yang',
    displayName: 'Yang Earth (戊土)',
    metaphor: 'Mountain',
    explanation:
      'Yang Earth (戊土) represents solid, immovable stability—like a mountain that stands unchanged through seasons. This manifests as grounded presence, reliable strength, and natural authority. You provide stability and structure, standing firm when others shift.',
  },

  己: {
    character: '己',
    element: 'Earth',
    polarity: 'Yin',
    displayName: 'Yin Earth (己土)',
    metaphor: 'Fertile garden',
    explanation:
      'Yin Earth (己土) represents nurturing, cultivating stability—like garden soil that helps things grow. This manifests as supportive energy, natural caregiving, and the ability to help others develop. You create conditions for growth rather than imposing structure.',
  },

  庚: {
    character: '庚',
    element: 'Metal',
    polarity: 'Yang',
    displayName: 'Yang Metal (庚金)',
    metaphor: 'Forged sword',
    explanation:
      'Yang Metal (庚金) represents sharp, decisive cutting—like a sword that cuts through with precision. This manifests as direct decisiveness, strong principles, and the ability to see and act on what needs to be done. You cut through ambiguity and confusion with clarity.',
  },

  辛: {
    character: '辛',
    element: 'Metal',
    polarity: 'Yin',
    displayName: 'Yin Metal (辛金)',
    metaphor: 'Polished gem',
    explanation:
      'Yin Metal (辛金) represents refined, precise value—like a carefully cut diamond. This manifests as attention to detail, aesthetic sense, and the ability to identify and create quality. You refine things to their most valuable form through careful crafting.',
  },

  壬: {
    character: '壬',
    element: 'Water',
    polarity: 'Yang',
    displayName: 'Yang Water (壬水)',
    metaphor: 'Ocean waves',
    explanation:
      "Yang Water (壬水) represents powerful, flowing movement—like ocean currents that shape coastlines. This manifests as strategic thinking, big-picture vision, and the ability to navigate complex situations. Your mind moves like water, finding paths others don't see.",
  },

  癸: {
    character: '癸',
    element: 'Water',
    polarity: 'Yin',
    displayName: 'Yin Water (癸水)',
    metaphor: 'Morning dew',
    explanation:
      'Yin Water (癸水) represents gentle, penetrating nourishment—like dew that seeps into everything. This manifests as intuitive depth, emotional intelligence, and the ability to understand hidden patterns. You perceive subtleties that others miss entirely.',
  },
};

/**
 * Day Branch (日支) explanations - 12 branches
 */
export const DAY_BRANCH_EXPLANATIONS: Record<string, any> = {
  子: {
    character: '子',
    animal: 'Rat',
    displayName: 'Rat (子)',
    explanation:
      'The Rat (子) brings resourcefulness, adaptability, and quick-thinking energy. This influences your behavioral style toward finding clever solutions and navigating situations with intelligence.',
  },
  丑: {
    character: '丑',
    animal: 'Ox',
    displayName: 'Ox (丑)',
    explanation:
      'The Ox (丑) brings steadfast, reliable, and methodical energy. This influences your behavioral style toward patience, persistence, and steady progress.',
  },
  寅: {
    character: '寅',
    animal: 'Tiger',
    displayName: 'Tiger (寅)',
    explanation:
      'The Tiger (寅) brings bold, courageous, and confident energy. This influences your behavioral style toward taking initiative and facing challenges head-on.',
  },
  卯: {
    character: '卯',
    animal: 'Rabbit',
    displayName: 'Rabbit (卯)',
    explanation:
      'The Rabbit (卯) brings diplomatic, graceful, and tactful energy. This influences your behavioral style toward harmonious relationships and careful navigation.',
  },
  辰: {
    character: '辰',
    animal: 'Dragon',
    displayName: 'Dragon (辰)',
    explanation:
      'The Dragon (辰) brings ambitious, visionary, and transformative energy. This influences your behavioral style toward big thinking and pursuing significant goals.',
  },
  巳: {
    character: '巳',
    animal: 'Snake',
    displayName: 'Snake (巳)',
    explanation:
      'The Snake (巳) brings perceptive, strategic, and intuitive energy. This influences your behavioral style toward careful observation and calculated action.',
  },
  午: {
    character: '午',
    animal: 'Horse',
    displayName: 'Horse (午)',
    explanation:
      'The Horse (午) brings independent, energetic, and freedom-seeking energy. This influences your behavioral style toward autonomy and forward movement.',
  },
  未: {
    character: '未',
    animal: 'Goat',
    displayName: 'Goat (未)',
    explanation:
      'The Goat (未) brings creative, artistic, and gentle energy. This influences your behavioral style toward imaginative approaches and aesthetic sensitivity.',
  },
  申: {
    character: '申',
    animal: 'Monkey',
    displayName: 'Monkey (申)',
    explanation:
      'The Monkey (申) brings clever, playful, and innovative energy. This influences your behavioral style toward creative problem-solving and mental agility.',
  },
  酉: {
    character: '酉',
    animal: 'Rooster',
    displayName: 'Rooster (酉)',
    explanation:
      'The Rooster (酉) brings meticulous, precise, and detail-oriented energy. This influences your behavioral style toward thoroughness and careful execution.',
  },
  戌: {
    character: '戌',
    animal: 'Dog',
    displayName: 'Dog (戌)',
    explanation:
      'The Dog (戌) brings loyal, protective, and principled energy. This influences your behavioral style toward commitment and standing by your values.',
  },
  亥: {
    character: '亥',
    animal: 'Pig',
    displayName: 'Pig (亥)',
    explanation:
      'The Pig (亥) brings generous, sincere, and warm-hearted energy. This influences your behavioral style toward openness and genuine connection.',
  },
};

/**
 * General explanation of Bazi system (same for all users)
 */
export const GENERAL_BASIS_EXPLANATION = `
In Bazi (八字), also known as Four Pillars of Destiny (四柱命理), your birth chart is divided into four pillars representing different aspects of your life:

- **Year Pillar (年柱):** Ancestry, social identity, early life
- **Month Pillar (月柱):** Career foundation, parental influence
- **Day Pillar (日柱):** Core self, intimate relationships
- **Hour Pillar (時柱):** Children, legacy, later life

Your **Day Pillar (日柱)** is the most important because it represents YOU—your core personality, how you process information, make decisions, and interact with the world.

The Day Pillar consists of two parts:

1. **Day Stem (日干) = Your Day Master (日主)**  
   This is your essential nature. In traditional Bazi, everything in the chart is analyzed relative to this element.

2. **Day Branch (日支)**  
   This represents your inner nature, behavioral style, and how you naturally approach situations.

Together, these create your fundamental personality pattern—the "operating system" that shapes how you experience and respond to life.
`;
