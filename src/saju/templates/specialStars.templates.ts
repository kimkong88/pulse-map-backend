/**
 * Special Stars (神煞) templates for natal profile
 * These are auspicious/challenging cosmic influences
 */

export interface SpecialStarTemplate {
  key: 'nobleman' | 'intelligence' | 'skyHorse' | 'peachBlossom';
  name: string;
  chineseName: string;
  koreanName?: string; // Optional Korean name for reference
  emoji: string;
  description: string;
  affectedCategories: Array<
    'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
  >;
}

/**
 * All special star templates
 */
export const SPECIAL_STAR_TEMPLATES: Record<string, SpecialStarTemplate> = {
  nobleman: {
    key: 'nobleman',
    name: 'Noble Person',
    chineseName: '天乙貴人',
    koreanName: '천을귀인',
    emoji: '👑',
    description:
      'Mentors, supporters, and helpful people appear at crucial moments in your life. When you face obstacles, someone influential steps in to help. You have a natural ability to attract guidance and protection from authority figures.',
    affectedCategories: ['career', 'relationships', 'personalGrowth'],
  },

  intelligence: {
    key: 'intelligence',
    name: 'Academic Star',
    chineseName: '文昌',
    koreanName: '문창',
    emoji: '📚',
    description:
      'You have natural advantages in learning, testing, writing, and intellectual pursuits. Academic success comes more easily to you than most. Excellent memory, quick comprehension, and a talent for communicating complex ideas clearly.',
    affectedCategories: ['career', 'personalGrowth'],
  },

  skyHorse: {
    key: 'skyHorse',
    name: 'Travel Destiny',
    chineseName: '驛馬',
    koreanName: '역마',
    emoji: '🏇',
    description:
      'Movement, change, and exploration define your path. You thrive when you travel, relocate, or embrace new environments. Staying in one place too long makes you restless. International opportunities, remote work, or frequent change suit you well.',
    affectedCategories: ['career', 'personalGrowth', 'relationships'],
  },

  peachBlossom: {
    key: 'peachBlossom',
    name: 'Romance Magnetism',
    chineseName: '桃花',
    koreanName: '도화',
    emoji: '🌸',
    description:
      'You have natural charisma and social appeal. People are drawn to you, especially romantically. This brings opportunities in relationships, social influence, and careers requiring charm (sales, entertainment, hospitality). Use this power wisely—it attracts attention both wanted and unwanted.',
    affectedCategories: ['relationships', 'career'],
  },
};

export interface ActiveSpecialStar extends SpecialStarTemplate {
  count: number; // Number of occurrences (for nobleman)
  branches: string[]; // Branch characters where star appears
}

/**
 * Get rooted special stars that are present in the user's chart
 * Note: Filtering for "rooted" status happens in baziExtractor.util.ts
 * All stars returned here are already validated as rooted (present in natal chart)
 */
export function getActiveSpecialStars(
  specialStars: {
    nobleman: string[];
    intelligence: string | null;
    skyHorse: string | null;
    peachBlossom: string | null;
  } | null,
): ActiveSpecialStar[] {
  if (!specialStars) return [];

  const active: ActiveSpecialStar[] = [];

  // Nobleman: Can appear in multiple branches (count indicates strength)
  if (specialStars.nobleman && specialStars.nobleman.length > 0) {
    active.push({
      ...SPECIAL_STAR_TEMPLATES.nobleman,
      count: specialStars.nobleman.length,
      branches: specialStars.nobleman,
    });
  }

  // Other stars: Single branch (all are rooted by definition)
  if (specialStars.intelligence) {
    active.push({
      ...SPECIAL_STAR_TEMPLATES.intelligence,
      count: 1,
      branches: [specialStars.intelligence],
    });
  }

  if (specialStars.skyHorse) {
    active.push({
      ...SPECIAL_STAR_TEMPLATES.skyHorse,
      count: 1,
      branches: [specialStars.skyHorse],
    });
  }

  if (specialStars.peachBlossom) {
    active.push({
      ...SPECIAL_STAR_TEMPLATES.peachBlossom,
      count: 1,
      branches: [specialStars.peachBlossom],
    });
  }

  return active;
}

