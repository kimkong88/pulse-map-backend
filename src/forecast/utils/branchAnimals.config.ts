/**
 * Branch Animals Configuration
 * Maps BaZi branch characters to animal names and emojis
 * 
 * Note: The daily branch (animal) is the same for everyone on the same day
 */

export const BRANCH_ANIMALS: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
};

export const BRANCH_EMOJIS: Record<string, string> = {
  子: '🐀', // Rat
  丑: '🐂', // Ox
  寅: '🐅', // Tiger
  卯: '🐇', // Rabbit
  辰: '🐉', // Dragon
  巳: '🐍', // Snake
  午: '🐴', // Horse
  未: '🐐', // Goat
  申: '🐵', // Monkey
  酉: '🐓', // Rooster
  戌: '🐕', // Dog
  亥: '🐷', // Pig
};

export const BRANCH_MEANINGS: Record<string, string> = {
  子: 'Resourcefulness and adaptability are favored today. Quick thinking and clever solutions come naturally.',
  丑: 'Steadfastness and reliability are favored today. Patience and methodical progress bring results.',
  寅: 'Boldness and courage are favored today. Taking initiative and facing challenges head-on brings opportunities.',
  卯: 'Diplomacy and grace are favored today. Harmonious relationships and careful navigation are key.',
  辰: 'Ambition and vision are favored today. Big thinking and pursuing significant goals are supported.',
  巳: 'Perception and strategy are favored today. Careful observation and calculated action bring success.',
  午: 'Independence and movement are favored today. Forward momentum and autonomy are supported.',
  未: 'Creativity and artistry are favored today. Imaginative approaches and aesthetic sensitivity shine.',
  申: 'Cleverness and innovation are favored today. Creative problem-solving and mental agility are key.',
  酉: 'Precision and detail are favored today. Thoroughness and careful execution bring results.',
  戌: 'Loyalty and protection are favored today. Commitment and standing by your values are supported.',
  亥: 'Generosity and warmth are favored today. Openness and genuine connection bring opportunities.',
};

export function getBranchAnimal(branch: string): string | null {
  return BRANCH_ANIMALS[branch] || null;
}

export function getBranchEmoji(branch: string): string {
  return BRANCH_EMOJIS[branch] || '✨';
}

export function getBranchMeaning(branch: string): string | null {
  return BRANCH_MEANINGS[branch] || null;
}
