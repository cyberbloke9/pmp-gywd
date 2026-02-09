import { Router } from 'express';
import { parseState, getPatterns, getExpertise, getProjects } from '../lib/gywd-data';

const router = Router();

/** GET /api/v1/status - Project status overview */
router.get('/', (_req, res) => {
  const state = parseState();
  const patterns = getPatterns();
  const expertise = getExpertise();
  const projects = getProjects();

  res.json({
    success: true,
    data: {
      state,
      stats: {
        totalPatterns: patterns.length,
        expertiseAreas: Object.keys(expertise).length,
        projectsCount: projects.length,
      },
    },
  });
});

export default router;
