import type { Request, Response } from 'express';
import {
  getAnalyticsOverview,
  getBusinessForUserAccess,
  getCampaignPerformance,
  getCustomerEngagementSummary,
  getReviewsTrend,
  getVisibilityTrend
} from '../services/analytics.service';

const parseDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getBusinessId = (req: Request) => (Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId);

const ensureBusinessAccess = async (req: Request, res: Response) => {
  const businessId = getBusinessId(req);
  const business = await getBusinessForUserAccess(businessId, req.user!.id);

  if (!business) {
    res.status(404).json({ message: 'Business not found' });
    return null;
  }

  return businessId;
};

const getRange = (req: Request) => ({
  startDate: parseDate(req.query.startDate),
  endDate: parseDate(req.query.endDate)
});

export const getAnalyticsOverviewHandler = async (req: Request, res: Response) => {
  const businessId = await ensureBusinessAccess(req, res);

  if (!businessId) {
    return;
  }

  const result = await getAnalyticsOverview(businessId, getRange(req));
  return res.json(result);
};

export const getVisibilityTrendHandler = async (req: Request, res: Response) => {
  const businessId = await ensureBusinessAccess(req, res);

  if (!businessId) {
    return;
  }

  const result = await getVisibilityTrend(businessId, getRange(req));
  return res.json(result);
};

export const getReviewsTrendHandler = async (req: Request, res: Response) => {
  const businessId = await ensureBusinessAccess(req, res);

  if (!businessId) {
    return;
  }

  const result = await getReviewsTrend(businessId, getRange(req));
  return res.json(result);
};

export const getCampaignPerformanceHandler = async (req: Request, res: Response) => {
  const businessId = await ensureBusinessAccess(req, res);

  if (!businessId) {
    return;
  }

  const result = await getCampaignPerformance(businessId, getRange(req));
  return res.json(result);
};

export const getEngagementHandler = async (req: Request, res: Response) => {
  const businessId = await ensureBusinessAccess(req, res);

  if (!businessId) {
    return;
  }

  const result = await getCustomerEngagementSummary(businessId, getRange(req));
  return res.json(result);
};