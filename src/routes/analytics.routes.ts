import { Router } from 'express';
import {
  getAnalyticsOverviewHandler,
  getCampaignPerformanceHandler,
  getEngagementHandler,
  getReviewsTrendHandler,
  getVisibilityTrendHandler
} from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:businessId/overview', getAnalyticsOverviewHandler);
router.get('/:businessId/visibility-trend', getVisibilityTrendHandler);
router.get('/:businessId/reviews-trend', getReviewsTrendHandler);
router.get('/:businessId/campaigns', getCampaignPerformanceHandler);
router.get('/:businessId/engagement', getEngagementHandler);

export default router;