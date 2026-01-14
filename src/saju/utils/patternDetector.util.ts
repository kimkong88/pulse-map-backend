import { UserContext, NatalPattern } from '../types';

/**
 * PatternDetector - Detects natal Bazi chart patterns (格局)
 *
 * Patterns are fixed configurations in the natal chart that significantly
 * alter interpretation and provide structural advantages/challenges.
 *
 * Implementation Strategy: Phase 1 (Top 15 patterns covering 80% of charts)
 * - 8 Regular patterns (月令格局)
 * - 7 Common combination patterns (組合格局)
 *
 * Philosophy: Patterns are detected ONCE and remain fixed for life
 */
export class PatternDetector {
  /**
   * Detect all patterns present in the user's natal chart
   *
   * @param context User's natal context (from BaziExtractor.buildUserContext())
   * @returns Array of detected patterns
   */
  static detectPatterns(context: UserContext): NatalPattern[] {
    const patterns: NatalPattern[] = [];

    // Phase 1: Detect combination patterns (組合格局)
    // These are the most impactful and easiest to detect
    patterns.push(...this.detectCombinationPatterns(context));

    // Phase 2: Detect regular patterns (月令格局) - TODO: Next phase
    // patterns.push(...this.detectRegularPatterns(context));

    return patterns;
  }

  // ============================================================================
  // COMBINATION PATTERNS (組合格局) - Phase 1
  // ============================================================================

  /**
   * Detect combination patterns (interactions between Ten Gods)
   *
   * These arise from specific relationships between Ten Gods in the natal chart.
   * Detection is straightforward: check if specific Ten Gods exist in pillars.
   */
  private static detectCombinationPatterns(
    context: UserContext,
  ): NatalPattern[] {
    const patterns: NatalPattern[] = [];

    // Extract Ten Gods from natal structure
    const tenGods = this.extractTenGods(context);

    // === TIER 1: Most Common & Impactful Patterns ===

    // 1. 食傷生財 (Output → Wealth) - Creativity generates money
    if (this.hasOutputAndWealth(tenGods)) {
      patterns.push({
        id: 'shi-shang-sheng-cai',
        name: 'The Wealth Generator',
        chineseName: '食傷生財',
        category: 'combination',
        detectionMethod:
          'Output stars (Shi Shen/Shang Guan) + Wealth stars (Zheng Cai/Pian Cai)',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Shi Shen',
          'Shang Guan',
          'Zheng Cai',
          'Pian Cai',
        ]),
        affectedCategories: ['career', 'wealth', 'personalGrowth'],
        multiplier: 1.2, // 20% boost (will be applied later with timeframe weights)
        description:
          'Your talents and creativity naturally convert into income. You have a rare ability to monetize your skills and turn ideas into profitable ventures.',
        strength: this.calculatePatternStrength(context, [
          'Shi Shen',
          'Shang Guan',
          'Zheng Cai',
          'Pian Cai',
        ]),
        significance: 'very-high',
      });
    }

    // 2. 傷官配印 (Hurting Officer + Resource) - Brilliance + discipline
    if (this.hasHurtingOfficerAndResource(tenGods)) {
      patterns.push({
        id: 'shang-guan-pei-yin',
        name: 'The Creative Genius',
        chineseName: '傷官配印',
        category: 'combination',
        detectionMethod: 'Shang Guan + Resource stars (Zheng Yin/Pian Yin)',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Shang Guan',
          'Zheng Yin',
          'Pian Yin',
        ]),
        affectedCategories: ['career', 'personalGrowth'],
        multiplier: 1.15,
        description:
          'You combine breakthrough creativity with intellectual discipline. Your rebellious ideas are grounded in deep knowledge, making you exceptionally innovative in fields requiring both originality and expertise.',
        strength: this.calculatePatternStrength(context, [
          'Shang Guan',
          'Zheng Yin',
          'Pian Yin',
        ]),
        significance: 'high',
      });
    }

    // 3. 殺印相生 (Killing + Resource) - Power + wisdom
    if (this.hasKillingAndResource(tenGods)) {
      patterns.push({
        id: 'sha-yin-xiang-sheng',
        name: 'The Authority',
        chineseName: '殺印相生',
        category: 'combination',
        detectionMethod: 'Qi Sha + Resource stars',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Qi Sha',
          'Zheng Yin',
          'Pian Yin',
        ]),
        affectedCategories: ['career', 'wellness'],
        multiplier: 1.18,
        description:
          'You command respect through a rare combination of power and wisdom. People naturally look to you for leadership in high-pressure situations. Excellent for executive roles, military, or strategic positions.',
        strength: this.calculatePatternStrength(context, [
          'Qi Sha',
          'Zheng Yin',
          'Pian Yin',
        ]),
        significance: 'high',
      });
    }

    // 4. 財官雙美 (Wealth + Officer) - Money + status harmony
    if (this.hasWealthAndOfficer(tenGods)) {
      patterns.push({
        id: 'cai-guan-shuang-mei',
        name: 'The Power Player',
        chineseName: '財官雙美',
        category: 'combination',
        detectionMethod: 'Wealth stars + Officer stars (Zheng Guan/Qi Sha)',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Cai',
          'Pian Cai',
          'Zheng Guan',
          'Qi Sha',
        ]),
        affectedCategories: ['career', 'wealth'],
        multiplier: 1.25,
        description:
          'You naturally attract both wealth and status. Money and influence flow together in your life, making you exceptional at building empires, leading organizations, or succeeding in business and politics.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Cai',
          'Pian Cai',
          'Zheng Guan',
          'Qi Sha',
        ]),
        significance: 'very-high',
      });
    }

    // 5. 食神制殺 (Eating God controls Killing) - Gentle controls fierce
    if (this.hasFoodControlsKilling(tenGods)) {
      patterns.push({
        id: 'shi-shen-zhi-sha',
        name: 'The Peacemaker',
        chineseName: '食神制殺',
        category: 'combination',
        detectionMethod: 'Shi Shen + Qi Sha',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Shi Shen',
          'Qi Sha',
        ]),
        affectedCategories: ['career', 'wellness', 'relationships'],
        multiplier: 1.12,
        description:
          'You defuse high-pressure situations with ease and charm. Where others see conflict, you find diplomatic solutions. Natural talent for negotiation, mediation, and turning adversaries into allies.',
        strength: this.calculatePatternStrength(context, [
          'Shi Shen',
          'Qi Sha',
        ]),
        significance: 'high',
      });
    }

    // === TIER 2: Warning Patterns (Challenging Combinations) ===

    // 6. 傷官見官 (Hurting Officer sees Officer) - Rebellion vs authority (BAD)
    if (this.hasHurtingOfficerAndOfficer(tenGods)) {
      patterns.push({
        id: 'shang-guan-jian-guan',
        name: 'The Rebel',
        chineseName: '傷官見官',
        category: 'combination',
        detectionMethod: 'Shang Guan + Zheng Guan',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Shang Guan',
          'Zheng Guan',
        ]),
        affectedCategories: ['career', 'relationships'],
        multiplier: 0.85, // Challenging pattern (15% penalty)
        description:
          'You naturally challenge traditional systems and authority figures. While this makes you innovative, it can create friction in structured environments. Entrepreneurship or creative fields suit you better than corporate hierarchies.',
        strength: this.calculatePatternStrength(context, [
          'Shang Guan',
          'Zheng Guan',
        ]),
        significance: 'high',
      });
    }

    // 7. 官殺混雜 (Officer + Killing mixed) - Confused authority (BAD)
    if (this.hasOfficerAndKillingMixed(tenGods)) {
      patterns.push({
        id: 'guan-sha-hun-za',
        name: 'The Overthinker',
        chineseName: '官殺混雜',
        category: 'combination',
        detectionMethod: 'Zheng Guan + Qi Sha both present',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Guan',
          'Qi Sha',
        ]),
        affectedCategories: ['career', 'wellness'],
        multiplier: 0.9, // Challenging pattern (10% penalty)
        description:
          'You face competing pressures and divided loyalties. Decision-making can be difficult when you see too many valid paths. Clarity comes from committing to one direction rather than hedging.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Guan',
          'Qi Sha',
        ]),
        significance: 'medium',
      });
    }

    // === TIER 3: Additional Beneficial Patterns ===

    // 8. 印多為貴 (Many Resources) - Academic excellence
    if (this.hasManyResources(tenGods)) {
      patterns.push({
        id: 'yin-duo-wei-gui',
        name: 'The Scholar',
        chineseName: '印多為貴',
        category: 'combination',
        detectionMethod: 'Multiple Resource stars (Zheng Yin/Pian Yin)',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Yin',
          'Pian Yin',
        ]),
        affectedCategories: ['career', 'personalGrowth'],
        multiplier: 1.15,
        description:
          'You excel in academic, research, or knowledge-based fields. Natural learner with strong theoretical thinking. Credibility and expertise are your superpowers.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Yin',
          'Pian Yin',
        ]),
        significance: 'high',
      });
    }

    // 9. 財多身弱 (Wealth Overwhelm) - Too many opportunities
    if (this.hasWealthOverwhelm(context, tenGods)) {
      patterns.push({
        id: 'cai-duo-shen-ruo',
        name: 'The Opportunity Magnet',
        chineseName: '財多身弱',
        category: 'combination',
        detectionMethod: 'Many Wealth stars + Weak Day Master',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Cai',
          'Pian Cai',
        ]),
        affectedCategories: ['wealth', 'wellness'],
        multiplier: 0.95, // Slight challenge (5% penalty)
        description:
          'Opportunities flood your life, but you may feel stretched thin. Success comes from selective focus rather than chasing every option. Quality over quantity is your key to sustainable wealth.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Cai',
          'Pian Cai',
        ]),
        significance: 'medium',
      });
    }

    // 10. 比劫成群 (Many Competitors) - Competitive environment
    if (this.hasManyCompetitors(tenGods)) {
      patterns.push({
        id: 'bi-jie-cheng-qun',
        name: 'The Competitor',
        chineseName: '比劫成群',
        category: 'combination',
        detectionMethod: 'Multiple Bi Jian/Jie Cai stars',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Bi Jian',
          'Jie Cai',
        ]),
        affectedCategories: ['career', 'relationships', 'wealth'],
        multiplier: 0.92, // Challenging (8% penalty)
        description:
          'You thrive in competitive environments but may face rivalry or partnership conflicts. Your success requires clear boundaries and learning to collaborate without losing yourself.',
        strength: this.calculatePatternStrength(context, [
          'Bi Jian',
          'Jie Cai',
        ]),
        significance: 'medium',
      });
    }

    // 11. 官印相生 (Officer + Resource) - Traditional success path
    if (this.hasOfficerAndResource(tenGods)) {
      patterns.push({
        id: 'guan-yin-xiang-sheng',
        name: 'The Professional',
        chineseName: '官印相生',
        category: 'combination',
        detectionMethod: 'Zheng Guan + Resource stars',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Guan',
          'Zheng Yin',
          'Pian Yin',
        ]),
        affectedCategories: ['career', 'personalGrowth'],
        multiplier: 1.18,
        description:
          'You excel in traditional professional paths—law, medicine, government, corporate leadership. Education and credentials open doors for you. Respect and reputation come naturally.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Guan',
          'Zheng Yin',
          'Pian Yin',
        ]),
        significance: 'high',
      });
    }

    // 12. 財滋弱殺 (Wealth supports Killing) - Money fuels ambition
    if (this.hasWealthSupportsKilling(tenGods)) {
      patterns.push({
        id: 'cai-zi-ruo-sha',
        name: 'The Empire Builder',
        chineseName: '財滋弱殺',
        category: 'combination',
        detectionMethod: 'Wealth stars + Qi Sha',
        involvedPillars: this.getPillarsWithTenGods(context, [
          'Zheng Cai',
          'Pian Cai',
          'Qi Sha',
        ]),
        affectedCategories: ['career', 'wealth'],
        multiplier: 1.22,
        description:
          'Your wealth directly fuels your ambitions. Money is not the end goal—it is the tool you use to build influence, control, and legacy. Natural entrepreneur or investor.',
        strength: this.calculatePatternStrength(context, [
          'Zheng Cai',
          'Pian Cai',
          'Qi Sha',
        ]),
        significance: 'very-high',
      });
    }

    return patterns;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract all Ten Gods from natal structure
   */
  private static extractTenGods(context: UserContext): Set<string> {
    const tenGods = new Set<string>();

    const { social, career, personal, innovation } = context.natalStructure;

    if (social.tenGod) tenGods.add(social.tenGod);
    if (career.tenGod) tenGods.add(career.tenGod);
    if (personal.tenGod) tenGods.add(personal.tenGod); // Always null (Day Master)
    if (innovation?.tenGod) tenGods.add(innovation.tenGod);

    return tenGods;
  }

  /**
   * Get pillar names (year/month/day/hour) that contain specific Ten Gods
   */
  private static getPillarsWithTenGods(
    context: UserContext,
    targetTenGods: string[],
  ): Array<'year' | 'month' | 'day' | 'hour'> {
    const pillars: Array<'year' | 'month' | 'day' | 'hour'> = [];
    const { social, career, personal, innovation } = context.natalStructure;

    if (social.tenGod && targetTenGods.includes(social.tenGod))
      pillars.push('year');
    if (career.tenGod && targetTenGods.includes(career.tenGod))
      pillars.push('month');
    if (personal.tenGod && targetTenGods.includes(personal.tenGod))
      pillars.push('day');
    if (innovation?.tenGod && targetTenGods.includes(innovation.tenGod))
      pillars.push('hour');

    return pillars;
  }

  /**
   * Calculate pattern strength based on pillar positions
   *
   * Strength hierarchy:
   * - Month pillar (career prime): Strongest
   * - Day/Hour pillars: Medium
   * - Year pillar: Weakest (but still relevant)
   * - Multiple pillars: Stronger
   */
  private static calculatePatternStrength(
    context: UserContext,
    relevantTenGods: string[],
  ): 'strong' | 'moderate' | 'weak' {
    const pillars = this.getPillarsWithTenGods(context, relevantTenGods);

    // Strong: Month pillar involved OR multiple pillars
    if (pillars.includes('month') || pillars.length >= 3) {
      return 'strong';
    }

    // Moderate: 2 pillars OR day/hour involved
    if (
      pillars.length === 2 ||
      pillars.includes('day') ||
      pillars.includes('hour')
    ) {
      return 'moderate';
    }

    // Weak: Only year pillar
    return 'weak';
  }

  // ============================================================================
  // PATTERN DETECTION LOGIC
  // ============================================================================

  /**
   * 食傷生財 (Output → Wealth)
   * Output stars (Shi Shen/Shang Guan) + Wealth stars (Zheng Cai/Pian Cai)
   */
  private static hasOutputAndWealth(tenGods: Set<string>): boolean {
    const hasOutput = tenGods.has('Shi Shen') || tenGods.has('Shang Guan');
    const hasWealth = tenGods.has('Zheng Cai') || tenGods.has('Pian Cai');
    return hasOutput && hasWealth;
  }

  /**
   * 傷官配印 (Hurting Officer + Resource)
   */
  private static hasHurtingOfficerAndResource(tenGods: Set<string>): boolean {
    const hasHurtingOfficer = tenGods.has('Shang Guan');
    const hasResource = tenGods.has('Zheng Yin') || tenGods.has('Pian Yin');
    return hasHurtingOfficer && hasResource;
  }

  /**
   * 殺印相生 (Killing + Resource)
   */
  private static hasKillingAndResource(tenGods: Set<string>): boolean {
    const hasKilling = tenGods.has('Qi Sha');
    const hasResource = tenGods.has('Zheng Yin') || tenGods.has('Pian Yin');
    return hasKilling && hasResource;
  }

  /**
   * 財官雙美 (Wealth + Officer)
   */
  private static hasWealthAndOfficer(tenGods: Set<string>): boolean {
    const hasWealth = tenGods.has('Zheng Cai') || tenGods.has('Pian Cai');
    const hasOfficer = tenGods.has('Zheng Guan') || tenGods.has('Qi Sha');
    return hasWealth && hasOfficer;
  }

  /**
   * 食神制殺 (Eating God controls Killing)
   */
  private static hasFoodControlsKilling(tenGods: Set<string>): boolean {
    return tenGods.has('Shi Shen') && tenGods.has('Qi Sha');
  }

  /**
   * 傷官見官 (Hurting Officer sees Officer) - WARNING
   */
  private static hasHurtingOfficerAndOfficer(tenGods: Set<string>): boolean {
    return tenGods.has('Shang Guan') && tenGods.has('Zheng Guan');
  }

  /**
   * 官殺混雜 (Officer + Killing mixed) - WARNING
   */
  private static hasOfficerAndKillingMixed(tenGods: Set<string>): boolean {
    return tenGods.has('Zheng Guan') && tenGods.has('Qi Sha');
  }

  /**
   * 印多為貴 (Many Resources)
   */
  private static hasManyResources(tenGods: Set<string>): boolean {
    const resourceCount =
      (tenGods.has('Zheng Yin') ? 1 : 0) + (tenGods.has('Pian Yin') ? 1 : 0);
    return resourceCount >= 2; // Both types present, indicating strong resource presence
  }

  /**
   * 財多身弱 (Wealth Overwhelm)
   * Requires checking if chart strength is weak AND multiple wealth stars present
   */
  private static hasWealthOverwhelm(
    context: UserContext,
    tenGods: Set<string>,
  ): boolean {
    const isWeak = context.chartStrength?.strength === 'Weak';
    const hasMultipleWealth =
      tenGods.has('Zheng Cai') && tenGods.has('Pian Cai');
    return isWeak && hasMultipleWealth;
  }

  /**
   * 比劫成群 (Many Competitors)
   */
  private static hasManyCompetitors(tenGods: Set<string>): boolean {
    return tenGods.has('Bi Jian') && tenGods.has('Jie Cai');
  }

  /**
   * 官印相生 (Officer + Resource)
   */
  private static hasOfficerAndResource(tenGods: Set<string>): boolean {
    const hasOfficer = tenGods.has('Zheng Guan');
    const hasResource = tenGods.has('Zheng Yin') || tenGods.has('Pian Yin');
    return hasOfficer && hasResource;
  }

  /**
   * 財滋弱殺 (Wealth supports Killing)
   */
  private static hasWealthSupportsKilling(tenGods: Set<string>): boolean {
    const hasWealth = tenGods.has('Zheng Cai') || tenGods.has('Pian Cai');
    const hasKilling = tenGods.has('Qi Sha');
    return hasWealth && hasKilling;
  }
}
