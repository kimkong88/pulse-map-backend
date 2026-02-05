import { ElementType } from '@aharris02/bazi-calculator-by-alvamind';
import { NatalPattern } from '../types';

/**
 * Luck Cycle Theme System
 * 
 * 40-50 unique themes based on:
 * - Ten God relationship (primary)
 * - Element favorability (primary)
 * - Life Cycle intensity (branch strength)
 * - Pattern influence (rare but significant)
 */

type LifeCycleIntensity = 'strong' | 'moderate' | 'weak';

interface LuckCycleThemeInput {
  tenGod: string | null;
  stemElement: ElementType;
  branchLifeCycle: string | null;
  favorableElements: {
    primary: ElementType[];
    secondary: ElementType[];
    unfavorable: ElementType[];
  };
  natalPatterns: NatalPattern[];
  chartStrength: {
    strength: 'Strong' | 'Weak' | 'Balanced';
    score: number;
    notes?: string[];
  } | null;
}

interface LuckCycleTheme {
  emoji: string;
  title: string;
  description: string;
}

/**
 * Get Life Cycle intensity from branch life cycle stage
 * 
 * Handles both Chinese and English names from library
 * Verified against viewAggregator.util.ts LIFE_CYCLE_MULTIPLIERS (lines 38-66)
 * Strong stages: 长生/Birth, 临官/Official, 帝旺/Emperor/Thriving
 * Weak stages: 死/Death, 墓/Tomb, 绝/Extinction, 病/Sick
 */
function getLifeCycleIntensity(lifeCycle: string | null): LifeCycleIntensity {
  if (!lifeCycle) return 'moderate';

  // Strong stages (from viewAggregator: 长生, Birth, 临官, Official, 帝旺, Emperor, Thriving)
  const strongStages = [
    'Emperor', '帝旺', 'Thriving',
    'Official', '临官',
    'Birth', '长生',
  ];

  // Weak stages (from viewAggregator: 死, Death, 墓, Tomb, 绝, Extinction, 病, Sick)
  const weakStages = [
    'Death', '死',
    'Tomb', '墓',
    'Extinction', '绝',
    'Sick', '病',
  ];

  if (strongStages.includes(lifeCycle)) return 'strong';
  if (weakStages.includes(lifeCycle)) return 'weak';
  return 'moderate';
}

/**
 * Check if element is favorable
 */
function isElementFavorable(
  element: ElementType,
  favorableElements: { primary: ElementType[]; secondary: ElementType[]; unfavorable: ElementType[] },
): 'favorable' | 'neutral' | 'unfavorable' {
  if (favorableElements.primary.includes(element) || favorableElements.secondary.includes(element)) {
    return 'favorable';
  }
  if (favorableElements.unfavorable.includes(element)) {
    return 'unfavorable';
  }
  return 'neutral';
}

/**
 * Map library Ten God name (Pinyin) to our canonical English format
 * 
 * Library returns Pinyin format from TEN_GOD_RELATIONSHIP_MAP:
 * - "Zheng Guan", "Qi Sha", "Zheng Cai", "Pian Cai", "Zheng Yin", "Pian Yin"
 * - "Shi Shen", "Shang Guan", "Bi Jian", "Jie Cai"
 * 
 * Source: node_modules/@aharris02/bazi-calculator-by-alvamind/dist/index.js:7086-7092
 */
function mapLibraryTenGodToCanonical(name: string | null): string | null {
  if (!name) return null;

  // Library uses Pinyin format - map directly to our English names
  const libraryToCanonical: Record<string, string> = {
    // From library's TEN_GOD_RELATIONSHIP_MAP
    'Zheng Guan': 'Direct Officer',      // 正官
    'Qi Sha': '7 Killings',              // 七殺
    'Zheng Cai': 'Direct Wealth',        // 正財
    'Pian Cai': 'Indirect Wealth',        // 偏財
    'Zheng Yin': 'Direct Resource',       // 正印
    'Pian Yin': 'Indirect Resource',      // 偏印
    'Shi Shen': 'Eating God',             // 食神
    'Shang Guan': 'Hurting Officer',      // 傷官
    'Bi Jian': 'Friend',                  // 比肩
    'Jie Cai': 'Rob Wealth',              // 劫財
  };

  // Direct lookup (library returns Pinyin)
  const canonical = libraryToCanonical[name.trim()];
  if (canonical) {
    return canonical;
  }

  // Fallback: if library format changes, return as-is (will use fallback theme)
  return name.trim();
}

/**
 * Check pattern influence on Ten God
 * 
 * Pattern IDs verified from patternDetector.util.ts
 * Uses canonical English Ten God names for reliable matching
 */
function getPatternEffect(tenGod: string, patterns: NatalPattern[]): string | null {
  // Map library format (Pinyin) to canonical format
  const canonicalTenGod = mapLibraryTenGodToCanonical(tenGod);
  if (!canonicalTenGod) return null;

  // Pattern: 食傷生財 (Output Generates Wealth) - verified from patternDetector.util.ts
  const hasOutputWealthPattern = patterns.some(
    (p) => p.id === 'shi-shang-sheng-cai' || p.chineseName === '食傷生財',
  );
  if (hasOutputWealthPattern && canonicalTenGod === 'Hurting Officer') {
    return 'enhanced-creative-wealth';
  }

  // Pattern: 財官雙美 (Wealth + Officer) - verified from patternDetector.util.ts
  const hasWealthOfficerPattern = patterns.some(
    (p) => p.id === 'cai-guan-shuang-mei' || p.chineseName === '財官雙美',
  );
  if (hasWealthOfficerPattern) {
    if (canonicalTenGod === 'Direct Officer') {
      return 'enhanced-crowned';
    }
    if (canonicalTenGod === 'Direct Wealth' || canonicalTenGod === 'Indirect Wealth') {
      return 'enhanced-crowned-wealth';
    }
  }

  // Pattern: 傷官配印 (Hurting Officer + Resource) - verified from patternDetector.util.ts
  const hasHurtingOfficerResourcePattern = patterns.some(
    (p) => p.id === 'shang-guan-pei-yin' || p.chineseName === '傷官配印',
  );
  if (hasHurtingOfficerResourcePattern && canonicalTenGod === 'Hurting Officer') {
    return 'enhanced-wisdom-transformation';
  }

  // Pattern: 食神制殺 (Eating God Controls Killing) - verified from patternDetector.util.ts
  const hasEatingGodKillingPattern = patterns.some(
    (p) => p.id === 'shi-shen-zhi-sha' || p.chineseName === '食神制殺',
  );
  if (hasEatingGodKillingPattern && canonicalTenGod === '7 Killings') {
    return 'enhanced-tamed-power';
  }

  // Pattern: 傷官見官 (Hurting Officer Sees Officer) - NEGATIVE - verified from patternDetector.util.ts
  const hasHurtingOfficerOfficerPattern = patterns.some(
    (p) => p.id === 'shang-guan-jian-guan' || p.chineseName === '傷官見官',
  );
  if (hasHurtingOfficerOfficerPattern) {
    if (canonicalTenGod === 'Direct Officer') {
      return 'conflicted-authority';
    }
    if (canonicalTenGod === 'Hurting Officer') {
      return 'conflicted-rebellion';
    }
  }

  // Pattern: 官殺混雜 (Officer + Killing Mixed) - NEGATIVE - verified from patternDetector.util.ts
  const hasOfficerKillingMixedPattern = patterns.some(
    (p) => p.id === 'guan-sha-hun-za' || p.chineseName === '官殺混雜',
  );
  if (hasOfficerKillingMixedPattern) {
    if (canonicalTenGod === 'Direct Officer') {
      return 'conflicted-mixed-authority';
    }
    if (canonicalTenGod === '7 Killings') {
      return 'conflicted-divided-power';
    }
  }

  return null;
}

/**
 * Get unique theme name for luck cycle
 */
export function getLuckCycleTheme(input: LuckCycleThemeInput): LuckCycleTheme {
  const { tenGod, stemElement, branchLifeCycle, favorableElements, natalPatterns } = input;

  const elementFavorability = isElementFavorable(stemElement, favorableElements);
  const lifeCycleIntensity = getLifeCycleIntensity(branchLifeCycle);
  
  // Pre-Luck Era - only return this if tenGod is null (true Pre-Luck Era)
  // For valid luck pillars, Ten God should never be null (we always calculate it)
  if (!tenGod) {
    return {
      emoji: '🌱',
      title: 'Pre-Luck Era',
      description: 'You are in the Pre-Luck Era, a foundational period before your major 10-year cycles begin. This is a time of building core strengths, developing fundamental skills, and establishing the groundwork for future growth. Focus on learning, self-discovery, and laying solid foundations in all areas of life. Major life transformations will begin once you enter your first luck cycle.',
    };
  }

  const patternEffect = getPatternEffect(tenGod, natalPatterns);

  // Map library format (Pinyin) to canonical format for reliable matching
  // Library returns: "Zheng Guan", "Qi Sha", "Zheng Cai", etc. (Pinyin)
  // Note: mapLibraryTenGodToCanonical has a fallback that returns name.trim() if not found,
  // so canonicalTenGod should never be null (it would be the trimmed name)
  const canonicalTenGod = mapLibraryTenGodToCanonical(tenGod);
  if (!canonicalTenGod) {
    // Fallback: return generic theme if mapping fails (should be unreachable)
    return {
      emoji: '🔄',
      title: 'Transformation Cycle',
      description: 'You are entering a period of change and growth that requires adapting to new circumstances. This cycle brings transitions, shifts in various life areas, and opportunities for personal evolution. Expect changes that may require flexibility and adjustment. Focus on staying adaptable, embracing change, and learning from new experiences. This is a time for transformation and discovering new paths forward.',
    };
  }

  // Direct Officer (正官)
  if (canonicalTenGod === 'Direct Officer') {
    if (patternEffect === 'enhanced-crowned') {
      return {
        emoji: '👑',
        title: 'Crowned Cycle',
        description: 'This is an exceptional period where authority and wealth combine to create ideal conditions for success. Your leadership and career advancement are supported by strong financial resources and material stability. This cycle brings recognition, promotions, and opportunities to build both professional reputation and wealth simultaneously. Focus on leveraging your position to create lasting value and secure your future. This is a rare and powerful combination that should be maximized.',
      };
    }
    if (patternEffect === 'conflicted-authority') {
      return {
        emoji: '⚔️',
        title: 'Conflicted Authority Cycle',
        description: 'This period brings significant challenges to your authority, career, and reputation. You may face opposition, criticism, or situations that threaten your position or standing. Legal concerns, workplace conflicts, or reputation issues may arise. Focus on protecting your interests, maintaining professionalism, and avoiding unnecessary confrontations. This is a time for careful navigation, seeking support, and defending what you have built rather than expanding.',
      };
    }
    if (patternEffect === 'conflicted-mixed-authority') {
      return {
        emoji: '🔄',
        title: 'Divided Authority Cycle',
        description: 'This period brings conflicting authority influences that create confusion and indecision. You may face mixed signals, unclear direction, or competing demands from different sources of authority. Decision-making becomes challenging as you navigate between different expectations or requirements. Focus on clarifying priorities, seeking guidance, and avoiding hasty commitments. This is a time for careful evaluation and finding balance rather than taking definitive action.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '👑',
        title: 'Sovereign Cycle',
        description: 'This is a peak period for authority, recognition, and career advancement. You are in a highly favorable position to achieve formal recognition, receive promotions, and succeed within institutional or structured environments. Your leadership qualities are recognized, and opportunities for advancement are abundant. Focus on taking on greater responsibilities, building your reputation, and establishing yourself as a respected authority. This is an ideal time for career growth and professional achievement.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '🏛️',
        title: 'Authority Cycle',
        description: 'This period brings structured authority and disciplined growth in your career and professional life. You can expect proper recognition for your work, stable advancement opportunities, and support from authority figures. Focus on maintaining professionalism, following established procedures, and building your reputation through consistent performance. This is a good time for steady career development and gaining respect within your field or organization.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable authority is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '🛡️',
          title: 'Structure Cycle',
          description: 'This period brings authority that provides needed structure and support. While the energy may feel restrictive, it actually helps stabilize your foundation and provides the discipline you need to build strength. The controlling elements offer protection and guidance rather than pure limitation. Focus on accepting the structure, learning from authority figures, and using this period to build your capabilities. This is a time for growth through discipline rather than resistance.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '⛓️',
          title: 'Restraint Cycle',
          description: 'This period brings authority pressure that creates a restrictive and controlling environment. You may experience excessive oversight, limitations on your freedom, or forced discipline from authority figures. Career advancement may be blocked, and you may feel constrained or limited in your actions. Focus on maintaining patience, working within constraints, and avoiding conflicts with authority. This is a time for endurance and finding ways to work within limitations rather than fighting against them.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '⛓️',
        title: 'Restraint Cycle',
        description: 'This period brings authority pressure that creates a restrictive and controlling environment. You may experience excessive oversight, limitations on your freedom, or forced discipline from authority figures. Career advancement may be blocked, and you may feel constrained or limited in your actions. Focus on maintaining patience, working within constraints, and avoiding conflicts with authority. This is a time for endurance and finding ways to work within limitations rather than fighting against them.',
      };
    }
    return {
      emoji: '📋',
      title: 'Authority Cycle',
      description: 'This period emphasizes structured approaches, formal roles, and alignment with institutional or organizational systems. You are in a cycle that supports disciplined work, following established procedures, and operating within structured environments. Focus on fulfilling your responsibilities, maintaining professional standards, and working within existing frameworks. This is a time for steady, methodical progress rather than innovation or breaking new ground.',
    };
  }

  // 7 Killings (七殺)
  if (canonicalTenGod === '7 Killings') {
    if (patternEffect === 'enhanced-tamed-power') {
      return {
        emoji: '🛡️',
        title: 'Tamed Power Cycle',
        description: 'This is a powerful period where fierce energy is balanced and controlled by gentleness. Your leadership style becomes more diplomatic and managed, allowing you to exercise influence through peaceful means rather than force. This combination creates ideal conditions for strategic leadership, conflict resolution, and building alliances. Focus on using soft power, building consensus, and leading through wisdom rather than dominance. This is an excellent time for diplomatic achievements and managed growth.',
      };
    }
    if (patternEffect === 'conflicted-divided-power') {
      return {
        emoji: '⚡',
        title: 'Divided Power Cycle',
        description: 'This period brings conflicting power dynamics that prevent you from committing fully to any single direction. You may experience doubled stress as competing forces pull you in different directions, diluting your energy and focus. Decision-making becomes difficult, and you may feel torn between different paths or responsibilities. Focus on prioritizing, making clear choices, and avoiding overcommitment. This is a time for consolidation and focus rather than taking on multiple challenges simultaneously.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '⚡',
        title: 'Command Cycle',
        description: 'This is a peak period for power, leadership, and strategic influence. Your fierce leadership qualities are at their strongest, allowing you to exercise unconventional authority and make bold decisions. This cycle supports taking command, leading change, and exercising strategic influence. Focus on ambitious goals, decisive action, and establishing your authority. This is an ideal time for breakthrough leadership and transformative power.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '🎯',
        title: 'Power Cycle',
        description: 'This period brings strategic power and behind-the-scenes influence. You can exercise authority through advisory roles, strategic planning, and subtle influence rather than direct command. Your power comes from wisdom, strategy, and positioning rather than force. Focus on building networks, providing guidance, and exercising influence through indirect means. This is a good time for strategic advancement and building your reputation as a trusted advisor.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable power is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '⚡',
          title: 'Pressure Cycle',
          description: 'This period brings competitive pressure that challenges you to build strength and resilience. While the energy is intense, it pushes you to develop capabilities you didn\'t know you had. The pressure creates opportunities for growth through adversity. Focus on building your foundation, managing stress constructively, and using challenges to strengthen yourself. This is a time for developing inner strength rather than avoiding pressure.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '💥',
          title: 'Turbulent Cycle',
          description: 'This period brings intense pressure, high stress, and competitive challenges. You may face health concerns, increased competition, or situations that test your limits. The unfavorable energy creates turbulence and instability in various life areas. Focus on managing stress, protecting your health, and avoiding unnecessary conflicts. This is a time for defense, self-care, and strategic retreat rather than aggressive advancement.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '💥',
        title: 'Turbulent Cycle',
        description: 'This period brings intense pressure, high stress, and competitive challenges. You may face health concerns, increased competition, or situations that test your limits. The unfavorable energy creates turbulence and instability in various life areas. Focus on managing stress, protecting your health, and avoiding unnecessary conflicts. This is a time for defense, self-care, and strategic retreat rather than aggressive advancement.',
      };
    }
    return {
      emoji: '⚡',
      title: 'Pressure Cycle',
      description: 'This is an intense period with a competitive environment, strategic challenges, and high-stakes situations. You will face pressure from various sources, requiring careful navigation and strategic thinking. Expect increased competition, challenging circumstances, and situations that demand your full attention. Focus on staying alert, managing pressure effectively, and making calculated decisions. This is a time for resilience and strategic action rather than impulsive moves.',
    };
  }

  // Direct Wealth (正財)
  if (canonicalTenGod === 'Direct Wealth') {
    if (patternEffect === 'enhanced-crowned-wealth') {
      return {
        emoji: '💎',
        title: 'Crowned Wealth Cycle',
        description: 'This is an exceptional period where wealth and authority combine to create ideal conditions for financial success. Your financial resources are enhanced by recognition and professional standing, creating opportunities to build both wealth and reputation simultaneously. This cycle supports major financial achievements, asset accumulation, and establishing material security. Focus on leveraging your position to create lasting financial value and secure your future. This is a rare and powerful combination for building wealth with authority backing.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '💎',
        title: 'Prosperity Cycle',
        description: 'This is a peak period for wealth accumulation and material security. You can expect stable financial growth, significant asset accumulation, and strong material foundations. This cycle supports major financial achievements, building savings, and creating lasting financial value. Focus on making sound financial decisions, investing wisely, and building your assets. This is an ideal time for financial planning and securing your material future.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '💰',
        title: 'Stability Cycle',
        description: 'This period brings stable wealth and reliable financial conditions. You can expect steady income, consistent savings growth, and tangible financial achievements. This cycle supports building financial security through steady, methodical approaches rather than dramatic gains. Focus on maintaining financial discipline, building savings, and making practical financial decisions. This is a good time for stable financial growth and creating solid material foundations.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable wealth is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '💵',
          title: 'Resource Cycle',
          description: 'This period brings financial focus that requires careful management and discipline. While wealth accumulation may be slower, the constraints help you build better financial habits and appreciate what you have. The limitations teach valuable lessons about resource management. Focus on building financial discipline, protecting your resources, and finding stability through careful planning. This is a time for developing financial wisdom rather than seeking quick gains.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '💸',
          title: 'Burden Cycle',
          description: 'This period brings financial pressure, material concerns, and resource constraints. You may experience financial stress, difficulty accumulating wealth, or concerns about material security. The unfavorable energy creates challenges in financial matters and may require careful budgeting and resource management. Focus on protecting what you have, avoiding unnecessary expenses, and finding creative solutions to financial challenges. This is a time for financial caution and strategic resource management rather than expansion.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '💸',
        title: 'Burden Cycle',
        description: 'This period brings financial pressure, material concerns, and resource constraints. You may experience financial stress, difficulty accumulating wealth, or concerns about material security. The unfavorable energy creates challenges in financial matters and may require careful budgeting and resource management. Focus on protecting what you have, avoiding unnecessary expenses, and finding creative solutions to financial challenges. This is a time for financial caution and strategic resource management rather than expansion.',
      };
    }
    return {
      emoji: '💵',
      title: 'Stability Cycle',
      description: 'This period emphasizes material focus and stable financial management. You are in a cycle that supports steady income, asset management, and creating tangible value. Focus on practical financial decisions, maintaining financial stability, and building material resources through consistent effort. This is a time for steady financial progress and creating solid material foundations rather than seeking dramatic financial gains.',
    };
  }

  // Indirect Wealth (偏財)
  if (canonicalTenGod === 'Indirect Wealth') {
    if (patternEffect === 'enhanced-creative-wealth') {
      return {
        emoji: '🎨',
        title: 'Creative Wealth Cycle',
        description: 'This period brings wealth opportunities through creativity and talent monetization. Your artistic abilities, creative skills, or innovative ideas can generate income streams and financial opportunities. This cycle supports turning your talents into financial value and finding creative ways to generate wealth. Focus on developing your creative skills, exploring innovative income sources, and leveraging your unique talents. This is an ideal time for creative entrepreneurship and building wealth through your abilities.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '🌟',
        title: 'Fortune Cycle',
        description: 'This is a peak period for financial opportunities and dynamic wealth creation. You can expect windfall gains, strong investment returns, and multiple income streams. This cycle supports speculative ventures, entrepreneurial opportunities, and flexible financial strategies. Focus on seizing opportunities, making strategic investments, and diversifying your income sources. This is an ideal time for bold financial moves and building wealth through multiple channels.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '💫',
        title: 'Opportunity Cycle',
        description: 'This period brings dynamic wealth opportunities through speculative gains, entrepreneurial ventures, and flexible income sources. You have chances to create wealth through opportunities, investments, or business ventures. Focus on staying alert to opportunities, being flexible with your financial strategies, and exploring new income possibilities. This is a good time for entrepreneurial activities and building wealth through dynamic approaches.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable indirect wealth is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '💫',
          title: 'Opportunity Cycle',
          description: 'This period brings financial opportunities that require careful evaluation and selective action. While the wealth sources may be unpredictable, there are chances to build resources through flexible approaches. The volatility teaches you to adapt and make smart choices. Focus on evaluating opportunities carefully, taking calculated risks, and building wealth through diverse but manageable sources. This is a time for learning financial flexibility rather than avoiding all risk.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '🌊',
          title: 'Volatility Cycle',
          description: 'This period brings unstable wealth conditions with financial fluctuations, risky ventures, and resource battles. Your financial situation may be unpredictable, with gains and losses coming in waves. The unfavorable energy creates volatility and uncertainty in financial matters. Focus on protecting your resources, avoiding high-risk ventures, and maintaining financial stability. This is a time for financial caution and conservative strategies rather than speculative moves.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '🌊',
        title: 'Volatility Cycle',
        description: 'This period brings unstable wealth conditions with financial fluctuations, risky ventures, and resource battles. Your financial situation may be unpredictable, with gains and losses coming in waves. The unfavorable energy creates volatility and uncertainty in financial matters. Focus on protecting your resources, avoiding high-risk ventures, and maintaining financial stability. This is a time for financial caution and conservative strategies rather than speculative moves.',
      };
    }
    return {
      emoji: '💫',
      title: 'Opportunity Cycle',
      description: 'This period emphasizes flexible wealth creation through multiple income streams, opportunistic projects, and varied financial sources. You have opportunities to build wealth through diverse channels and flexible approaches. Focus on exploring different income possibilities, staying open to opportunities, and building wealth through varied sources. This is a time for financial flexibility and exploring new ways to generate income.',
    };
  }

  // Direct Resource (正印)
  if (canonicalTenGod === 'Direct Resource') {
    if (patternEffect === 'enhanced-wisdom-transformation') {
      return {
        emoji: '📚',
        title: 'Enlightened Cycle',
        description: 'This is a powerful period where wisdom and education transform challenges into growth opportunities. Your learning and knowledge accumulation help resolve conflicts and navigate difficulties. This cycle supports using education as a tool for personal development and problem-solving. Focus on continuous learning, seeking knowledge, and applying wisdom to overcome obstacles. This is an ideal time for educational pursuits and using knowledge to create positive change.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '📚',
        title: 'Wisdom Cycle',
        description: 'This is a peak period for learning, knowledge accumulation, and educational achievement. You are in an ideal position to pursue formal education, build credentials, and engage in traditional study. This cycle strongly supports academic pursuits, professional development, and building expertise in your field. Focus on structured learning, completing educational programs, and accumulating knowledge that will serve you long-term. This is an excellent time for educational investments and building intellectual capital.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '📖',
        title: 'Learning Cycle',
        description: 'This period emphasizes educational focus, formal learning, and wisdom cultivation. You are in a cycle that supports knowledge work, academic pursuits, and intellectual development. Focus on engaging in structured learning, developing expertise, and building your knowledge base. This is a good time for professional development, taking courses, and cultivating wisdom through study and reflection.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable direct resource is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '📖',
          title: 'Support Cycle',
          description: 'This period brings support and protection that helps you build knowledge and stability. While you may rely more on others, this support provides the foundation you need to grow and learn. The protective energy helps you develop capabilities through guidance and mentorship. Focus on accepting help, learning from mentors, and using this period to build your knowledge base. This is a time for growth through support rather than premature independence.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '🔒',
          title: 'Dependency Cycle',
          description: 'This period brings challenges related to over-reliance on support and protection. You may experience a lack of independence, excessive protection from others, or limitations on your personal growth. The unfavorable energy creates dependency issues and may prevent you from developing self-reliance. Focus on building independence, taking responsibility for your own growth, and breaking free from excessive protection. This is a time for developing autonomy and self-sufficiency rather than relying on others.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '🔒',
        title: 'Dependency Cycle',
        description: 'This period brings challenges related to over-reliance on support and protection. You may experience a lack of independence, excessive protection from others, or limitations on your personal growth. The unfavorable energy creates dependency issues and may prevent you from developing self-reliance. Focus on building independence, taking responsibility for your own growth, and breaking free from excessive protection. This is a time for developing autonomy and self-sufficiency rather than relying on others.',
      };
    }
    return {
      emoji: '📖',
      title: 'Learning Cycle',
      description: 'This period emphasizes educational activities, knowledge accumulation, and academic pursuits. You are in a cycle that supports learning, teaching roles, and intellectual development. Focus on building your knowledge base, sharing what you know, and engaging in educational activities. This is a time for steady intellectual growth and contributing to knowledge through teaching or academic work.',
    };
  }

  // Indirect Resource (偏印)
  if (canonicalTenGod === 'Indirect Resource') {
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '🎭',
        title: 'Creative Protection Cycle',
        description: 'This is a peak period for creative wisdom and artistic development. You are in an ideal position to pursue unconventional learning, explore alternative growth paths, and develop your artistic or creative abilities. This cycle strongly supports non-traditional education, creative pursuits, and finding wisdom through unique experiences. Focus on developing your creative talents, exploring alternative knowledge systems, and growing through artistic expression. This is an excellent time for creative breakthroughs and unconventional personal development.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '🛡️',
        title: 'Protection Cycle',
        description: 'This period brings creative protection and nurturing support through artistic patronage and alternative knowledge. You have opportunities to receive support for your creative endeavors, explore unconventional wisdom, and develop through non-traditional paths. This cycle supports artistic development, alternative learning, and finding protection through creative expression. Focus on seeking mentorship, exploring creative opportunities, and building support networks around your artistic or unconventional pursuits.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable indirect resource is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '🛡️',
          title: 'Creative Protection Cycle',
          description: 'This period brings alternative support and creative protection that helps you develop unique perspectives. While the path may be unconventional, the protection allows you to explore creative wisdom safely. The isolation provides space for independent creative growth. Focus on developing your creative vision, finding alternative mentors, and using solitude for artistic development. This is a time for creative exploration rather than conforming to mainstream approaches.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '🏝️',
          title: 'Isolation Cycle',
          description: 'This period may bring creative isolation as you pursue unconventional wisdom and alternative paths. The unfavorable energy can create a sense of being separate from mainstream society or feeling isolated in your unique approach. You may need to walk your own path without traditional support. Focus on maintaining your creative vision despite isolation, finding like-minded individuals, and using solitude for creative development. This is a time for independent creative work and trusting your unconventional wisdom.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '🏝️',
        title: 'Isolation Cycle',
        description: 'This period may bring creative isolation as you pursue unconventional wisdom and alternative paths. The unfavorable energy can create a sense of being separate from mainstream society or feeling isolated in your unique approach. You may need to walk your own path without traditional support. Focus on maintaining your creative vision despite isolation, finding like-minded individuals, and using solitude for creative development. This is a time for independent creative work and trusting your unconventional wisdom.',
      };
    }
    return {
      emoji: '🛡️',
      title: 'Protection Cycle',
      description: 'This period emphasizes creative support through artistic development, unconventional wisdom, and alternative learning paths. You are in a cycle that supports exploring non-traditional knowledge, developing creative abilities, and finding protection through artistic expression. Focus on nurturing your creative talents, seeking alternative learning opportunities, and building support through creative communities. This is a time for artistic growth and developing wisdom through unconventional means.',
    };
  }

  // Eating God (食神)
  if (canonicalTenGod === 'Eating God') {
    if (patternEffect === 'enhanced-tamed-power') {
      return {
        emoji: '🎪',
        title: 'Diplomatic Talent Cycle',
        description: 'This is a powerful period where gentle talent controls and balances power. Your creative abilities enable diplomatic approaches, peaceful conflict resolution, and soft influence rather than force. This combination creates ideal conditions for using creativity to manage challenging situations and lead through inspiration rather than authority. Focus on developing your creative diplomacy skills, using talent to resolve conflicts, and exercising influence through creative expression. This is an excellent time for creative leadership and peaceful problem-solving.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '✨',
        title: 'Talent Cycle',
        description: 'This is a peak period for talent expression and creative flourishing. Your artistic abilities, creative talents, and service-oriented skills are at their strongest, supporting success through creative pursuits and service-based work. This cycle strongly supports developing your talents, pursuing artistic endeavors, and finding fulfillment through creative expression. Focus on honing your skills, pursuing creative projects, and building success through your natural talents. This is an ideal time for artistic achievement and service-based success.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '🎨',
        title: 'Expression Cycle',
        description: 'This period brings opportunities for creative expression and talent development. You are in a favorable cycle for artistic work, developing your creative abilities, and finding enjoyment in creative pursuits. This cycle supports expressing yourself through art, developing your talents, and finding fulfillment in creative activities. Focus on exploring your creative interests, developing your artistic skills, and finding joy in creative expression. This is a good time for artistic development and creative enjoyment.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable eating god is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '🎨',
          title: 'Expression Cycle',
          description: 'This period brings opportunities for creative expression that help you develop your talents. While output may require more energy, the creative work helps build your capabilities and confidence. The challenges teach you to express yourself more effectively. Focus on developing your creative skills, finding outlets for your talents, and using expression as a way to build strength. This is a time for creative growth rather than avoiding output.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '🌊',
          title: 'Drain Cycle',
          description: 'This period brings energy drain and creative exhaustion. You may experience excessive output without adequate returns, feel that your talents are underutilized, or struggle with creative burnout. The unfavorable energy creates challenges in expressing your talents effectively. Focus on managing your energy, avoiding overcommitment, and finding ways to recharge creatively. This is a time for rest, recovery, and strategic use of your talents rather than constant output.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '🌊',
        title: 'Drain Cycle',
        description: 'This period brings energy drain and creative exhaustion. You may experience excessive output without adequate returns, feel that your talents are underutilized, or struggle with creative burnout. The unfavorable energy creates challenges in expressing your talents effectively. Focus on managing your energy, avoiding overcommitment, and finding ways to recharge creatively. This is a time for rest, recovery, and strategic use of your talents rather than constant output.',
      };
    }
    return {
      emoji: '🎨',
      title: 'Expression Cycle',
      description: 'This period emphasizes creative expression through talent development, artistic pursuits, and service-based work. You are in a cycle that supports expressing your natural abilities, engaging in creative activities, and finding fulfillment through artistic or service-oriented endeavors. Focus on developing your talents, pursuing creative projects, and contributing through your artistic abilities. This is a time for steady creative growth and finding satisfaction through creative expression.',
    };
  }

  // Hurting Officer (傷官)
  if (canonicalTenGod === 'Hurting Officer') {
    if (patternEffect === 'enhanced-creative-wealth') {
      return {
        emoji: '🚀',
        title: 'Creative Breakthrough Cycle',
        description: 'This is an exceptional period where innovation generates wealth and creative rebellion becomes a professional asset. Your disruptive thinking and unconventional approaches can be monetized, turning your creative talents into financial opportunities. This cycle supports breaking conventions in ways that create value, using innovation to build wealth, and finding success through unconventional methods. Focus on channeling your creative rebellion into profitable ventures, monetizing your innovative ideas, and building wealth through your unique talents. This is a rare opportunity to turn disruption into professional success.',
      };
    }
    if (patternEffect === 'enhanced-wisdom-transformation') {
      return {
        emoji: '📚',
        title: 'Wisdom Transformation Cycle',
        description: 'This is a powerful period where education and learning transform your rebellious energy into constructive growth. Your intensity and disruptive tendencies are channeled through learning, and wisdom helps moderate conflicts. This cycle supports using education to direct your innovative energy positively, finding constructive outlets for your rebellious nature, and growing through knowledge. Focus on continuous learning, seeking education that channels your intensity, and using wisdom to transform challenges into opportunities. This is an ideal time for educational pursuits that help you grow constructively.',
      };
    }
    if (patternEffect === 'conflicted-rebellion') {
      return {
        emoji: '⚔️',
        title: 'Rebellion Cycle',
        description: 'This period brings active conflict where your authority and career stability are under attack. You may face challenges to your reputation, career instability, or situations that test your standing. The conflicting energy creates tension between your rebellious nature and the need for stability. Focus on protecting your interests, managing conflicts carefully, and finding constructive ways to express your need for change. This is a time for strategic defense and careful navigation rather than aggressive rebellion.',
      };
    }
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '🚀',
        title: 'Innovation Cycle',
        description: 'This is a peak period for transformation, breakthrough thinking, and technical mastery. Your innovative and disruptive abilities are at their strongest, supporting major breakthroughs, technical advancement, and transformative change. This cycle strongly supports challenging conventions, mastering technical skills, and creating disruptive innovations. Focus on pursuing breakthrough ideas, developing technical expertise, and leading transformative change. This is an ideal time for innovation and creating significant impact through your unique approach.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '💡',
        title: 'Transformation Cycle',
        description: 'This period brings opportunities for innovation, creative rebellion, and transformative thinking. You are in a favorable cycle for technical advancement, breaking conventions constructively, and thinking outside traditional frameworks. This cycle supports creative problem-solving, innovative approaches, and transformative ideas. Focus on developing your innovative thinking, pursuing technical advancement, and finding constructive ways to challenge the status quo. This is a good time for creative transformation and progressive thinking.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable hurting officer is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '💡',
          title: 'Transformation Cycle',
          description: 'This period brings opportunities for innovation and creative transformation that help you break through limitations. While the energy may feel disruptive, it pushes you to think differently and find new solutions. The rebellious tendencies can be channeled into constructive change. Focus on using your innovative thinking to solve problems, finding constructive outlets for disruption, and transforming challenges into opportunities. This is a time for creative problem-solving rather than avoiding change.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '🌪️',
          title: 'Rebellion Cycle',
          description: 'This period brings intense conflict with anti-authority tendencies, career instability, and relationship challenges. Your rebellious nature may create significant conflicts, instability in your career, or challenges in relationships. The unfavorable energy amplifies conflicts and makes it difficult to find constructive outlets. Focus on managing conflicts carefully, protecting your career stability, and finding ways to channel your rebellious energy constructively. This is a time for careful navigation and strategic management rather than aggressive rebellion.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '🌪️',
        title: 'Rebellion Cycle',
        description: 'This period brings intense conflict with anti-authority tendencies, career instability, and relationship challenges. Your rebellious nature may create significant conflicts, instability in your career, or challenges in relationships. The unfavorable energy amplifies conflicts and makes it difficult to find constructive outlets. Focus on managing conflicts carefully, protecting your career stability, and finding ways to channel your rebellious energy constructively. This is a time for careful navigation and strategic management rather than aggressive rebellion.',
      };
    }
    return {
      emoji: '💡',
      title: 'Transformation Cycle',
      description: 'This period emphasizes innovation through creative rebellion, breaking conventions, and technical mastery. You are in a cycle that supports thinking outside traditional frameworks, challenging established norms, and developing technical expertise. Focus on developing innovative solutions, pursuing technical advancement, and finding constructive ways to break conventions. This is a time for progressive thinking and transformative approaches rather than maintaining the status quo.',
    };
  }

  // Friend (比肩)
  if (canonicalTenGod === 'Friend') {
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '🤝',
        title: 'Partnership Cycle',
        description: 'This is a peak period for collaboration, strong partnerships, and team success. Your peer networks are at their strongest, supporting successful partnerships, effective teamwork, and mutual growth through collaboration. This cycle strongly supports building strong relationships with equals, working effectively in teams, and achieving success through partnership. Focus on developing partnerships, building peer networks, and leveraging teamwork for success. This is an ideal time for collaborative projects and building strong professional or personal partnerships.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '👥',
        title: 'Collaboration Cycle',
        description: 'This period emphasizes partnership focus through equal cooperation, peer support, and mutual growth. You are in a favorable cycle for working with equals, building collaborative relationships, and achieving success through partnership. This cycle supports equal partnerships, peer relationships, and mutual support. Focus on developing equal partnerships, seeking peer support, and building relationships based on mutual respect and cooperation. This is a good time for collaborative endeavors and building strong peer networks.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable friend is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '👥',
          title: 'Partnership Cycle',
          description: 'This period brings peer relationships that help you build strength through collaboration. While there may be some competition, the peer support provides opportunities to grow and learn from equals. The challenges teach you to work effectively with others. Focus on building partnerships, learning from peers, and using collaboration to develop your capabilities. This is a time for mutual growth rather than avoiding peer relationships.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '⚔️',
          title: 'Competition Cycle',
          description: 'This period brings peer competition, resource sharing conflicts, and challenging partnerships. You may experience rivalry with peers, conflicts over shared resources, or difficulties in maintaining equal partnerships. The unfavorable energy creates competition and conflict in peer relationships. Focus on managing competition constructively, protecting your resources, and finding ways to work with peers despite challenges. This is a time for strategic cooperation and managing competitive dynamics rather than avoiding peer relationships.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '⚔️',
        title: 'Competition Cycle',
        description: 'This period brings peer competition, resource sharing conflicts, and challenging partnerships. You may experience rivalry with peers, conflicts over shared resources, or difficulties in maintaining equal partnerships. The unfavorable energy creates competition and conflict in peer relationships. Focus on managing competition constructively, protecting your resources, and finding ways to work with peers despite challenges. This is a time for strategic cooperation and managing competitive dynamics rather than avoiding peer relationships.',
      };
    }
    return {
      emoji: '👥',
      title: 'Collaboration Cycle',
      description: 'This period emphasizes partnership through peer relationships, team projects, and equal cooperation. You are in a cycle that supports working with equals, building collaborative relationships, and achieving success through teamwork. Focus on developing peer relationships, engaging in team projects, and building partnerships based on equal cooperation. This is a time for steady collaboration and building strong working relationships with peers.',
    };
  }

  // Rob Wealth (劫財)
  if (canonicalTenGod === 'Rob Wealth') {
    if (elementFavorability === 'favorable' && lifeCycleIntensity === 'strong') {
      return {
        emoji: '🏆',
        title: 'Ambition Cycle',
        description: 'This is a peak competitive period with aggressive advancement opportunities, resource battles, and ambitious pursuits. Your competitive drive is at its strongest, supporting aggressive pursuit of goals, resource acquisition, and ambitious advancement. This cycle strongly supports taking competitive action, pursuing ambitious goals aggressively, and fighting for resources. Focus on channeling your competitive energy productively, pursuing ambitious goals, and strategically competing for resources. This is an ideal time for aggressive advancement and competitive success.',
      };
    }
    if (elementFavorability === 'favorable') {
      return {
        emoji: '⚡',
        title: 'Ambition Cycle',
        description: 'This period brings competitive drive through aggressive pursuit, resource acquisition, and ambitious advancement. You are in a favorable cycle for pursuing ambitious goals, competing for resources, and advancing through competitive means. This cycle supports aggressive action, resource competition, and ambitious pursuits. Focus on setting ambitious goals, competing effectively for resources, and pursuing advancement aggressively. This is a good time for competitive endeavors and ambitious goal achievement.',
      };
    }
    if (elementFavorability === 'unfavorable') {
      // Day Master strength affects how unfavorable rob wealth is experienced
      const strength = input.chartStrength?.strength;
      if (strength === 'Weak') {
        return {
          emoji: '⚡',
          title: 'Ambition Cycle',
          description: 'This period brings competitive drive that pushes you to pursue ambitious goals and build resources. While there may be competition, the competitive energy helps you develop strength and determination. The challenges teach you to compete effectively and protect your interests. Focus on channeling competitive energy productively, pursuing ambitious goals, and using competition to build your capabilities. This is a time for strategic advancement rather than avoiding competition.',
        };
      }
      if (strength === 'Strong') {
        return {
          emoji: '💥',
          title: 'Conflict Cycle',
          description: 'This period brings intense competition with resource battles, financial friction, and relationship conflicts. You may experience conflicts over resources, financial disputes, or challenges in relationships due to competitive dynamics. The unfavorable energy creates intense competition and conflict. Focus on managing conflicts carefully, protecting your resources, and finding ways to compete without destroying relationships. This is a time for strategic competition and conflict management rather than avoiding competition entirely.',
        };
      }
      // Balanced or null - use default unfavorable theme
      return {
        emoji: '💥',
        title: 'Conflict Cycle',
        description: 'This period brings intense competition with resource battles, financial friction, and relationship conflicts. You may experience conflicts over resources, financial disputes, or challenges in relationships due to competitive dynamics. The unfavorable energy creates intense competition and conflict. Focus on managing conflicts carefully, protecting your resources, and finding ways to compete without destroying relationships. This is a time for strategic competition and conflict management rather than avoiding competition entirely.',
      };
    }
    return {
      emoji: '⚡',
      title: 'Rivalry Cycle',
      description: 'This period emphasizes competitive dynamics through resource competition, ambitious pursuits, and aggressive advancement. You are in a cycle that supports competing for resources, pursuing ambitious goals, and advancing through competitive means. Focus on managing competition effectively, pursuing ambitious goals, and competing strategically for resources. This is a time for steady competitive advancement and building success through competitive efforts.',
    };
  }

  // Fallback: return generic theme if no Ten God matches (should be unreachable)
  return {
    emoji: '🔄',
    title: 'Transformation Cycle',
    description: 'You are entering a period of change and growth that requires adapting to new circumstances. This cycle brings transitions, shifts in various life areas, and opportunities for personal evolution. Expect changes that may require flexibility and adjustment. Focus on staying adaptable, embracing change, and learning from new experiences. This is a time for transformation and discovering new paths forward.',
  };
}
