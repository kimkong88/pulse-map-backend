import { Injectable } from '@nestjs/common';
import * as usersRepository from '../repositories/users.repository';
import * as subscriptionsRepository from '../repositories/subscriptions.repository';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  tier?: string;
  expiresAt?: Date;
}

@Injectable()
export class SubscriptionsService {
  /**
   * Check if user has an active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    // Get user to find accountId
    const user = await usersRepository.findById(userId);
    if (!user || !user.accountId) {
      return false;
    }

    // Check if account has an active subscription
    const activeSubscription =
      await subscriptionsRepository.findActiveSubscriptionByAccountId(
        user.accountId,
      );

    return !!activeSubscription;
  }

  /**
   * Get subscription status for user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    // Get user to find accountId
    const user = await usersRepository.findById(userId);
    if (!user || !user.accountId) {
      return { isSubscribed: false };
    }

    // Check if account has an active subscription
    const activeSubscription =
      await subscriptionsRepository.findActiveSubscriptionByAccountId(
        user.accountId,
      );

    if (!activeSubscription) {
      return { isSubscribed: false };
    }

    return {
      isSubscribed: true,
      tier: activeSubscription.tier,
      expiresAt: activeSubscription.expiresAt,
    };
  }

  /**
   * Add one month of subscription (test endpoint)
   * Only adds subscription if user is not already subscribed
   */
  async addOneMonthSubscription(userId: string): Promise<SubscriptionStatus> {
    // Get user to find accountId
    const user = await usersRepository.findById(userId);
    if (!user || !user.accountId) {
      throw new Error('User not found or has no account');
    }

    // Check if user already has an active subscription
    const activeSubscription =
      await subscriptionsRepository.findActiveSubscriptionByAccountId(
        user.accountId,
      );

    if (activeSubscription) {
      // User already has an active subscription, return current status
      return {
        isSubscribed: true,
        tier: activeSubscription.tier,
        expiresAt: activeSubscription.expiresAt,
      };
    }

    // Add one month subscription
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Add one month

    const subscription = await subscriptionsRepository.createSubscription({
      accountId: user.accountId,
      tier: 'pro',
      startedAt: now,
      expiresAt: expiresAt,
      amount: 0, // Test endpoint, no payment
      currency: 'USD',
    });

    return {
      isSubscribed: true,
      tier: subscription.tier,
      expiresAt: subscription.expiresAt,
    };
  }
}
