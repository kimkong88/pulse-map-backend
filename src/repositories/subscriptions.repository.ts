import { prisma } from '../prisma/client';

export const findActiveSubscriptionByAccountId = async (accountId: string) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      accountId,
      status: 'active',
      expiresAt: {
        gt: new Date(), // Subscription hasn't expired yet
      },
    },
  });
  return subscription;
};

export const createSubscription = async (data: {
  accountId: string;
  tier: 'pro';
  startedAt: Date;
  expiresAt: Date;
  amount: number;
  currency: string;
}) => {
  return prisma.subscription.create({
    data: {
      accountId: data.accountId,
      tier: data.tier,
      status: 'active',
      startedAt: data.startedAt,
      expiresAt: data.expiresAt,
      amount: data.amount,
      currency: data.currency,
    },
  });
};
