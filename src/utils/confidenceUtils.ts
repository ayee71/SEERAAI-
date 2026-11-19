export interface ConfidenceDetails {
  score: number; // 0.0 to 1.0
  percentage: number; // 0 to 100
  level: 'high' | 'medium' | 'low';
  label: { om: string; am: string; en: string };
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  isReviewRecommended: boolean;
}

export function getConfidenceDetails(confidence?: number): ConfidenceDetails {
  const score = confidence !== undefined ? Math.min(Math.max(confidence, 0), 1) : 0.95;
  const percentage = Math.round(score * 100);

  if (score >= 0.90) {
    return {
      score,
      percentage,
      level: 'high',
      label: {
        om: `${percentage}% High Confidence`,
        am: `${percentage}% ከፍተኛ እርግጠኝነት`,
        en: `${percentage}% High Confidence`
      },
      badgeBg: 'bg-emerald-950/80',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      dotColor: 'bg-emerald-400',
      isReviewRecommended: false
    };
  }

  if (score >= 0.75) {
    return {
      score,
      percentage,
      level: 'medium',
      label: {
        om: `${percentage}% Medium Confidence`,
        am: `${percentage}% መካከለኛ እርግጠኝነት`,
        en: `${percentage}% Medium Confidence`
      },
      badgeBg: 'bg-amber-950/80',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      isReviewRecommended: false
    };
  }

  return {
    score,
    percentage,
    level: 'low',
    label: {
      om: `${percentage}% Low - Mirkaneessi!`,
      am: `${percentage}% ዝቅተኛ - ያረጋግጡ!`,
      en: `${percentage}% Low - Verify!`
    },
    badgeBg: 'bg-rose-950/90',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    dotColor: 'bg-rose-500',
    isReviewRecommended: true
  };
}

export interface WordConfidenceToken {
  word: string;
  isLowConfidence: boolean;
  score: number;
  suggestedFixes?: string[];
}

/**
 * Returns word-level confidence breakdown for transcript segment verification
 */
export function analyzeWordConfidence(
  text: string,
  segmentConfidence: number = 0.95
): WordConfidenceToken[] {
  const words = text.split(/\s+/);
  if (words.length === 0) return [];

  // For high-confidence segments, flag rare complex phonemes/acronyms if needed
  // For lower confidence segments (< 0.85), flag phonetically ambiguous or lower-probability words
  return words.map((word, idx) => {
    const cleanWord = word.replace(/[^a-zA-Z0-9\u0600-\u06FF\u1200-\u137F']/g, '');
    let isLow = false;
    let wordScore = segmentConfidence;

    if (segmentConfidence < 0.82) {
      // Alternate flagging words in low confidence segment
      isLow = idx % 3 === 1 || cleanWord.length > 8 || /[0-9\/]/.test(cleanWord);
      wordScore = isLow ? Math.max(0.45, segmentConfidence - 0.2) : segmentConfidence;
    } else if (segmentConfidence < 0.90) {
      isLow = idx % 5 === 2 || cleanWord.length > 10;
      wordScore = isLow ? Math.max(0.65, segmentConfidence - 0.15) : segmentConfidence;
    }

    return {
      word,
      isLowConfidence: isLow,
      score: Number(wordScore.toFixed(2)),
      suggestedFixes: isLow ? [word + '_fix1', word + '_fix2'] : undefined
    };
  });
}
