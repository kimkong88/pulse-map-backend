/**
 * PatternInterpreter - Provides context-aware Ten God interpretation based on chart patterns
 *
 * Traditional Bazi principle: Ten God meanings change based on chart patterns.
 * Example: Shang Guan (Hurting Officer) is normally unfavorable in career,
 *          but in 食傷生財 pattern, it becomes favorable (creativity generates wealth).
 */

import { NatalPattern } from '../types';

export type InterpretationChange = {
  from: 'favorable' | 'neutral' | 'unfavorable' | 'mixed';
  to: 'enhanced' | 'favorable' | 'neutral' | 'unfavorable' | 'very-unfavorable';
  reason: string;
  confidence: 'high' | 'medium-high' | 'medium' | 'low';
};

export type CategoryInterpretation = {
  career?: InterpretationChange;
  wealth?: InterpretationChange;
  relationships?: InterpretationChange;
  wellness?: InterpretationChange;
  personalGrowth?: InterpretationChange;
};

/**
 * Pattern-specific interpretation rules
 * Based on research in PATTERN_INTERPRETATION_RULES.md
 */
const PATTERN_INTERPRETATION_RULES: Record<
  string,
  Record<string, CategoryInterpretation>
> = {
  // 1. 食傷生財 (Output Generates Wealth)
  'shi-shang-sheng-cai': {
    'Shang Guan': {
      career: {
        from: 'unfavorable',
        to: 'favorable',
        reason: 'Innovation and creativity become professional assets in this pattern',
        confidence: 'high',
      },
      wealth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Creative skills naturally monetize through talent-to-wealth cycle',
        confidence: 'high',
      },
      personalGrowth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Expression has constructive purpose, channeling rebellious energy',
        confidence: 'high',
      },
      relationships: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Direct communication becomes business asset, though still blunt',
        confidence: 'medium-high',
      },
      wellness: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Intense energy has productive outlet, reducing stress',
        confidence: 'medium',
      },
    },
    'Shi Shen': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Artistic talent directly generates income',
        confidence: 'high',
      },
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Gentle creativity creates sustainable income streams',
        confidence: 'high',
      },
    },
    'Zheng Cai': {
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Receives output energy through five-element generation cycle',
        confidence: 'high',
      },
    },
    'Pian Cai': {
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Output energy feeds speculative wealth opportunities',
        confidence: 'medium-high',
      },
    },
  },

  // 2. 傷官配印 (Hurting Officer + Resource)
  'shang-guan-pei-yin': {
    'Shang Guan': {
      career: {
        from: 'unfavorable',
        to: 'favorable',
        reason:
          'Education and cultivation transform rebellion into genius (傷官佩印，名揚天下)',
        confidence: 'medium-high',
      },
      personalGrowth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Learning channels raw talent into excellence',
        confidence: 'medium-high',
      },
      relationships: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Wisdom moderates harsh expression',
        confidence: 'medium',
      },
      wellness: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Resource energy cools down intense output',
        confidence: 'medium',
      },
    },
    'Zheng Yin': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Key transformer - education unlocks genius potential',
        confidence: 'medium-high',
      },
      personalGrowth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Critical cultivating role in pattern',
        confidence: 'medium-high',
      },
    },
    'Pian Yin': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Unconventional knowledge channels creativity',
        confidence: 'medium',
      },
      personalGrowth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Alternative learning paths unlock talent',
        confidence: 'medium',
      },
    },
  },

  // 3. 殺印相生 (Killing + Resource)
  'sha-yin-xiang-sheng': {
    'Qi Sha': {
      career: {
        from: 'mixed',
        to: 'favorable',
        reason:
          'Fierce pressure transformed into righteous authority (殺印相生，功名顯達)',
        confidence: 'medium-high',
      },
      wealth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Authoritative power yields material resources',
        confidence: 'medium',
      },
      personalGrowth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Pressure becomes growth catalyst via wisdom',
        confidence: 'medium-high',
      },
      wellness: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Resource provides buffer against stress',
        confidence: 'medium',
      },
      relationships: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Authority softened by wisdom',
        confidence: 'medium',
      },
    },
    'Zheng Yin': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Wisdom legitimizes and directs power',
        confidence: 'medium-high',
      },
      personalGrowth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Learning through challenge and pressure',
        confidence: 'medium-high',
      },
    },
    'Pian Yin': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Unconventional wisdom channels fierce energy',
        confidence: 'medium',
      },
    },
  },

  // 4. 食神制殺 (Eating God Controls Killing)
  'shi-shen-zhi-sha': {
    'Qi Sha': {
      career: {
        from: 'mixed',
        to: 'favorable',
        reason: 'Gentle control makes fierce power manageable and constructive',
        confidence: 'medium',
      },
      personalGrowth: {
        from: 'neutral',
        to: 'favorable',
        reason: 'Challenges become manageable through diplomatic approach',
        confidence: 'medium',
      },
      wellness: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Stress relieved by gentle dissipation of pressure',
        confidence: 'medium',
      },
      relationships: {
        from: 'unfavorable',
        to: 'neutral',
        reason: 'Soft power approach moderates conflicts',
        confidence: 'medium',
      },
    },
    'Shi Shen': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Elevated as peacemaker and diplomatic leader',
        confidence: 'medium',
      },
      relationships: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Conflict resolution skills become primary strength',
        confidence: 'medium',
      },
      personalGrowth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Wisdom through gentle control and diplomacy',
        confidence: 'medium',
      },
    },
  },

  // 5. 財官雙美 (Wealth + Officer)
  'cai-guan-shuang-mei': {
    'Zheng Cai': {
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Abundant resources in harmony with authority (財官雙全)',
        confidence: 'high',
      },
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Financial backing supports position and advancement',
        confidence: 'high',
      },
      relationships: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Stability and provider role enhanced by status',
        confidence: 'medium-high',
      },
    },
    'Pian Cai': {
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Opportunistic wealth harmonizes with authority',
        confidence: 'medium-high',
      },
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Business acumen supports official success',
        confidence: 'medium-high',
      },
    },
    'Zheng Guan': {
      career: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Authority backed by financial resources (財官雙全 ideal)',
        confidence: 'high',
      },
      wealth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Position yields income opportunities',
        confidence: 'high',
      },
      relationships: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Respectable status enhanced by material success',
        confidence: 'medium-high',
      },
      personalGrowth: {
        from: 'favorable',
        to: 'enhanced',
        reason: 'Righteousness combined with worldly success',
        confidence: 'medium-high',
      },
    },
  },

  // 6. 傷官見官 (Hurting Officer Sees Officer) - NEGATIVE
  'shang-guan-jian-guan': {
    'Shang Guan': {
      career: {
        from: 'unfavorable',
        to: 'very-unfavorable',
        reason:
          'Active warfare against authority creates career instability (傷官見官，為禍百端)',
        confidence: 'high',
      },
      relationships: {
        from: 'unfavorable',
        to: 'very-unfavorable',
        reason: 'Public conflicts and reputation damage',
        confidence: 'high',
      },
      wellness: {
        from: 'unfavorable',
        to: 'very-unfavorable',
        reason: 'Severe stress from ongoing conflicts',
        confidence: 'medium-high',
      },
    },
    'Zheng Guan': {
      career: {
        from: 'favorable',
        to: 'unfavorable',
        reason: 'Authority position constantly attacked and undermined',
        confidence: 'high',
      },
      relationships: {
        from: 'favorable',
        to: 'unfavorable',
        reason: 'Reputation damaged by conflicts',
        confidence: 'high',
      },
      wellness: {
        from: 'neutral',
        to: 'unfavorable',
        reason: 'Stress from damaged authority',
        confidence: 'medium',
      },
    },
  },

  // 7. 官殺混雜 (Officer + Killing Mixed) - NEGATIVE
  'guan-sha-hun-za': {
    'Zheng Guan': {
      career: {
        from: 'favorable',
        to: 'neutral',
        reason: 'Conflicting authority creates indecision and unclear direction',
        confidence: 'medium-high',
      },
      relationships: {
        from: 'favorable',
        to: 'neutral',
        reason: 'Unclear roles and mixed signals',
        confidence: 'medium',
      },
      personalGrowth: {
        from: 'neutral',
        to: 'unfavorable',
        reason: 'Identity confusion from competing paths',
        confidence: 'medium-high',
      },
    },
    'Qi Sha': {
      career: {
        from: 'mixed',
        to: 'unfavorable',
        reason: 'Cannot fully commit to fierce path, energy diluted',
        confidence: 'medium-high',
      },
      wellness: {
        from: 'unfavorable',
        to: 'very-unfavorable',
        reason: 'Doubled pressure from competing demands',
        confidence: 'medium-high',
      },
      relationships: {
        from: 'unfavorable',
        to: 'very-unfavorable',
        reason: 'Conflicting approaches create relationship chaos',
        confidence: 'medium',
      },
    },
  },
};

export class PatternInterpreter {
  /**
   * Get interpretation change for a Ten God in a specific category based on patterns
   */
  static getInterpretationChange(
    tenGodName: string,
    category: keyof CategoryInterpretation,
    patterns: NatalPattern[],
  ): InterpretationChange | null {
    if (!patterns || patterns.length === 0) {
      return null;
    }

    // Check each pattern for interpretation rules
    for (const pattern of patterns) {
      const patternRules = PATTERN_INTERPRETATION_RULES[pattern.id];
      if (!patternRules) continue;

      const tenGodRules = patternRules[tenGodName];
      if (!tenGodRules) continue;

      const categoryChange = tenGodRules[category];
      if (categoryChange) {
        return categoryChange;
      }
    }

    return null;
  }

  /**
   * Get final interpretation for a Ten God in a category, accounting for patterns
   */
  static getFinalInterpretation(
    tenGodName: string,
    category: keyof CategoryInterpretation,
    baseInterpretation: 'favorable' | 'neutral' | 'unfavorable' | 'mixed',
    patterns: NatalPattern[],
  ): {
    interpretation:
      | 'enhanced'
      | 'favorable'
      | 'neutral'
      | 'unfavorable'
      | 'very-unfavorable';
    reason?: string;
    confidence?: string;
    patternInfluenced: boolean;
  } {
    const change = this.getInterpretationChange(tenGodName, category, patterns);

    if (!change) {
      return {
        interpretation: baseInterpretation as any,
        patternInfluenced: false,
      };
    }

    return {
      interpretation: change.to,
      reason: change.reason,
      confidence: change.confidence,
      patternInfluenced: true,
    };
  }

  /**
   * Get human-readable description of interpretation change
   */
  static describeChange(change: InterpretationChange): string {
    const directionEmoji =
      change.to === 'enhanced' || change.to === 'favorable'
        ? '⬆️'
        : change.to === 'very-unfavorable'
          ? '⬇️⬇️'
          : change.to === 'unfavorable'
            ? '⬇️'
            : '➡️';

    return `${directionEmoji} ${change.from} → ${change.to}: ${change.reason}`;
  }

  /**
   * Get all affected Ten Gods by patterns
   */
  static getAffectedTenGods(patterns: NatalPattern[]): Set<string> {
    const affected = new Set<string>();

    for (const pattern of patterns) {
      const patternRules = PATTERN_INTERPRETATION_RULES[pattern.id];
      if (patternRules) {
        Object.keys(patternRules).forEach((tenGod) => affected.add(tenGod));
      }
    }

    return affected;
  }

  /**
   * Check if a specific pattern has interpretation rules defined
   */
  static hasInterpretationRules(patternId: string): boolean {
    return !!PATTERN_INTERPRETATION_RULES[patternId];
  }
}

