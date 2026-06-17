import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

type DateRangeInput = {
  startDate?: Date;
  endDate?: Date;
};

const buildDateFilter = (field: 'date' | 'calculatedAt' | 'createdAt', range: DateRangeInput) =>
  range.startDate || range.endDate
    ? {
        [field]: {
          ...(range.startDate ? { gte: range.startDate } : {}),
          ...(range.endDate ? { lte: range.endDate } : {})
        }
      }
    : {};

export const getAnalyticsOverview = async (businessId: string, range: DateRangeInput) => {
  const [business, analyticsRows, reviewAggregate, latestVisibility] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, category: true, visibilityScore: true }
    }),
    prisma.analytics.findMany({
      where: {
        businessId,
        ...buildDateFilter('date', range)
      },
      orderBy: { date: 'asc' }
    }),
    prisma.review.aggregate({
      where: {
        businessId,
        ...buildDateFilter('createdAt', range)
      },
      _count: { id: true },
      _avg: { rating: true }
    }),
    prisma.visibilityScore.findFirst({
      where: {
        businessId,
        ...buildDateFilter('calculatedAt', range)
      },
      orderBy: { calculatedAt: 'desc' }
    })
  ]);

  const totals = analyticsRows.reduce(
    (accumulator, row) => ({
      impressions: accumulator.impressions + row.impressions,
      clicks: accumulator.clicks + row.clicks,
      conversions: accumulator.conversions + row.conversions,
      websiteTraffic: accumulator.websiteTraffic + row.websiteTraffic
    }),
    { impressions: 0, clicks: 0, conversions: 0, websiteTraffic: 0 }
  );

  return {
    business,
    visibilityScore: latestVisibility?.overallScore ?? business?.visibilityScore ?? 0,
    totals,
    reviews: {
      total: reviewAggregate._count.id,
      averageRating: Number((reviewAggregate._avg.rating ?? 0).toFixed(2))
    },
    campaignEfficiency: {
      clickThroughRate: totals.impressions ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
      conversionRate: totals.clicks ? Number(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0
    }
  };
};

export const getVisibilityTrend = (businessId: string, range: DateRangeInput) =>
  prisma.visibilityScore.findMany({
    where: {
      businessId,
      ...buildDateFilter('calculatedAt', range)
    },
    orderBy: { calculatedAt: 'asc' },
    select: {
      calculatedAt: true,
      overallScore: true,
      googlePresence: true,
      websiteQuality: true,
      socialMediaActivity: true,
      reviewsReputation: true,
      localSeo: true,
      profileCompleteness: true
    }
  });

export const getReviewsTrend = async (businessId: string, range: DateRangeInput) => {
  const reviews = await prisma.review.findMany({
    where: {
      businessId,
      ...buildDateFilter('createdAt', range)
    },
    orderBy: { createdAt: 'asc' },
    select: {
      createdAt: true,
      rating: true,
      sentiment: true
    }
  });

  const grouped = new Map<string, { date: string; count: number; averageRatingTotal: number; sentiments: Record<string, number> }>();

  for (const review of reviews) {
    const date = review.createdAt.toISOString().slice(0, 10);
    const current = grouped.get(date) ?? {
      date,
      count: 0,
      averageRatingTotal: 0,
      sentiments: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 }
    };

    current.count += 1;
    current.averageRatingTotal += review.rating;
    current.sentiments[review.sentiment] += 1;
    grouped.set(date, current);
  }

  return Array.from(grouped.values()).map((entry) => ({
    date: entry.date,
    reviewCount: entry.count,
    averageRating: Number((entry.averageRatingTotal / entry.count).toFixed(2)),
    sentiments: entry.sentiments
  }));
};

export const getCampaignPerformance = async (businessId: string, range: DateRangeInput) => {
  const analyticsRows = await prisma.analytics.findMany({
    where: {
      businessId,
      ...buildDateFilter('date', range)
    },
    orderBy: { date: 'asc' }
  });

  return analyticsRows.map((row) => ({
    date: row.date,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    websiteTraffic: row.websiteTraffic,
    costPerConversion: row.costPerConversion,
    clickThroughRate: row.impressions ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0,
    conversionRate: row.clicks ? Number(((row.conversions / row.clicks) * 100).toFixed(2)) : 0
  }));
};

export const getCustomerEngagementSummary = async (businessId: string, range: DateRangeInput) => {
  const [analyticsAggregate, reviewAggregate, generatedContentCount] = await Promise.all([
    prisma.analytics.aggregate({
      where: {
        businessId,
        ...buildDateFilter('date', range)
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        websiteTraffic: true
      },
      _avg: {
        avgRating: true
      }
    }),
    prisma.review.aggregate({
      where: {
        businessId,
        ...buildDateFilter('createdAt', range)
      },
      _count: { id: true }
    }),
    prisma.generatedContent.count({
      where: {
        businessId,
        ...(range.startDate || range.endDate
          ? {
              createdAt: {
                ...(range.startDate ? { gte: range.startDate } : {}),
                ...(range.endDate ? { lte: range.endDate } : {})
              }
            }
          : {})
      }
    })
  ]);

  return {
    impressions: analyticsAggregate._sum.impressions ?? 0,
    clicks: analyticsAggregate._sum.clicks ?? 0,
    conversions: analyticsAggregate._sum.conversions ?? 0,
    websiteTraffic: analyticsAggregate._sum.websiteTraffic ?? 0,
    averageRating: Number((analyticsAggregate._avg.avgRating ?? 0).toFixed(2)),
    reviewCount: reviewAggregate._count.id,
    generatedContentCount
  };
};

export const getBusinessForUserAccess = (businessId: string, userId: string) =>
  prisma.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true }
  });