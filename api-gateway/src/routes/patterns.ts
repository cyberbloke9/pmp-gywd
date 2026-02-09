import { Router } from 'express';
import { getPatterns } from '../lib/gywd-data';

const router = Router();

/** GET /api/v1/patterns - Classified patterns */
router.get('/', (_req, res) => {
  const patterns = getPatterns() as Array<{ confidence: number; occurrences: number }>;

  const classified = {
    consensus: patterns.filter(p => p.confidence >= 0.7 && p.occurrences >= 3),
    emerging: patterns.filter(p => p.confidence >= 0.4 && p.confidence < 0.7),
    outlier: patterns.filter(p => p.confidence < 0.4 || p.occurrences <= 1),
  };

  res.json({
    success: true,
    data: {
      total: patterns.length,
      classified,
    },
  });
});

export default router;
