import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as blessingsRepository from '../repositories/blessings.repository';
import * as usersRepository from '../repositories/users.repository';
import * as friendsRepository from '../repositories/friends.repository';
import { SajuService } from '../saju/saju.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { toDate } from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { SendBlessingDto } from './blessings.dto';

const SERVER_TIMEZONE = 'America/Los_Angeles';

@Injectable()
export class BlessingsService {
  constructor(
    private readonly sajuService: SajuService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Get today's reset time (00:00 PST)
   * Returns the start of today in PST timezone
   */
  private getTodayResetTime(): Date {
    const now = new Date();
    // Get today's date in PST timezone
    const pstDate = formatInTimeZone(now, SERVER_TIMEZONE, 'yyyy-MM-dd');
    // Create date at 00:00:00 PST today
    const resetTimeString = `${pstDate}T00:00:00`;
    const resetTime = toDate(resetTimeString, { timeZone: SERVER_TIMEZONE });
    return resetTime;
  }

  /**
   * Check if user has availability to send a blessing today
   */
  async checkAvailability(userId: string) {
    const resetTime = this.getTodayResetTime();
    const hasSentToday = await blessingsRepository.findBlessingSentToday(
      userId,
      resetTime,
    );

    // Calculate next reset time (tomorrow 00:00 PST)
    const nextReset = new Date(resetTime);
    nextReset.setDate(nextReset.getDate() + 1);

    return {
      availableBlessings: hasSentToday ? 0 : 1,
      serverResetTime: nextReset.toISOString(),
    };
  }

  /**
   * Get active blessings received by user (not expired)
   * Includes sender info with identity and rarity
   */
  async getActiveBlessings(userId: string) {
    const blessings = await blessingsRepository.findActiveBlessingsReceived(
      userId,
    );

    // Fetch all friends once to avoid N+1 queries
    const friends = await friendsRepository.findFriendsByUserId(userId);
    const friendIds = new Set(friends.map((f) => f.friendUserId));

    // Enrich each blessing with sender's identity and rarity
    const enrichedBlessings = await Promise.all(
      blessings.map(async (blessing) => {
        const sender = blessing.sentBy;
        if (!sender) {
          return null;
        }

        // Get sender's identity and rarity
        const birthDateString = sender.birthDate
          .toISOString()
          .split('.')[0]; // Remove milliseconds and Z
        const birthDate = toDate(birthDateString, {
          timeZone: sender.birthTimezone,
        });

        const profile = await this.sajuService.getBasicProfile(
          birthDate,
          sender.gender,
          sender.birthTimezone,
          sender.isTimeKnown,
        );

        // Check if sender is a friend of the recipient (O(1) lookup)
        const isFriend = friendIds.has(sender.id);

        return {
          id: blessing.id,
          emoji: blessing.emoji,
          name: blessing.name,
          description: blessing.description,
          message: blessing.message,
          expiresAt: blessing.expiresAt.toISOString(),
          createdAt: blessing.createdAt.toISOString(),
          sender: {
            id: sender.id,
            code: sender.code,
            fullName: sender.fullName,
            identity: {
              code: profile.identity.code,
              title: profile.identity.title,
              element: profile.identity.element,
            },
            rarity: {
              oneIn: profile.rarity.oneIn,
            },
            isFriend,
          },
        };
      }),
    );

    // Filter out null values (shouldn't happen, but safety check)
    return enrichedBlessings.filter((b) => b !== null);
  }


  /**
   * Get all blessings received by user (expired or not)
   * For now, fetch all (pagination can be added later)
   */
  async getAllBlessings(userId: string) {
    const blessings = await blessingsRepository.findAllBlessingsReceived(
      userId,
    );

    // Check subscription status
    const isSubscribed = await this.subscriptionsService.hasActiveSubscription(
      userId,
    );

    // Fetch all friends once to avoid N+1 queries
    const friends = await friendsRepository.findFriendsByUserId(userId);
    const friendIds = new Set(friends.map((f) => f.friendUserId));

    const now = new Date();

    // Enrich each blessing with sender's identity and rarity
    const enrichedBlessings = await Promise.all(
      blessings.map(async (blessing) => {
        const sender = blessing.sentBy;
        if (!sender) {
          return null;
        }

        // Get sender's identity and rarity
        const birthDateString = sender.birthDate
          .toISOString()
          .split('.')[0]; // Remove milliseconds and Z
        const birthDate = toDate(birthDateString, {
          timeZone: sender.birthTimezone,
        });

        const profile = await this.sajuService.getBasicProfile(
          birthDate,
          sender.gender,
          sender.birthTimezone,
          sender.isTimeKnown,
        );

        // Check if sender is a friend of the recipient (O(1) lookup)
        const isFriend = friendIds.has(sender.id);

        const isExpired = blessing.expiresAt < now;

        return {
          id: blessing.id,
          emoji: blessing.emoji,
          name: blessing.name,
          description: blessing.description,
          message: blessing.message,
          expiresAt: blessing.expiresAt.toISOString(),
          createdAt: blessing.createdAt.toISOString(),
          isExpired,
          sender: {
            id: sender.id,
            code: sender.code,
            fullName: sender.fullName,
            identity: {
              code: profile.identity.code,
              title: profile.identity.title,
              element: profile.identity.element,
            },
            rarity: {
              oneIn: profile.rarity.oneIn,
            },
            isFriend,
          },
        };
      }),
    );

    // Filter out null values (shouldn't happen, but safety check)
    const validBlessings = enrichedBlessings.filter((b) => b !== null);

    // If not subscribed, filter out expired blessings
    const filteredBlessings = isSubscribed
      ? validBlessings
      : validBlessings.filter((b) => !b.isExpired);

    // Calculate counts
    const activeBlessingsCount = validBlessings.filter(
      (b) => !b.isExpired,
    ).length;
    const totalBlessingsCount = validBlessings.length;

    return {
      blessings: filteredBlessings,
      isSubscribed,
      activeBlessingsCount,
      totalBlessingsCount,
    };
  }

  /**
   * Send a blessing to a recipient
   * Checks availability first, validates recipient, and creates blessing
   */
  async sendBlessing(userId: string, sendBlessingDto: SendBlessingDto) {
    // 1. Check availability first
    const resetTime = this.getTodayResetTime();
    const hasSentToday = await blessingsRepository.findBlessingSentToday(
      userId,
      resetTime,
    );

    if (hasSentToday) {
      throw new BadRequestException('blessing_already_sent_today');
    }

    // 2. Find recipient by code
    const recipient = await usersRepository.findByCode(
      sendBlessingDto.recipientCode,
    );

    if (!recipient) {
      throw new NotFoundException('recipient_not_found');
    }

    // 3. Prevent sending to self
    if (recipient.id === userId) {
      throw new BadRequestException('cannot_send_blessing_to_self');
    }

    // 4. Create blessing with expiresAt = createdAt + 24 hours
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 24);

    const blessing = await blessingsRepository.createBlessing({
      emoji: sendBlessingDto.emoji,
      name: sendBlessingDto.name,
      description: sendBlessingDto.description,
      message: sendBlessingDto.message || null,
      sentBy: {
        connect: { id: userId },
      },
      receivedBy: {
        connect: { id: recipient.id },
      },
      expiresAt,
    });

    return {
      id: blessing.id,
      emoji: blessing.emoji,
      name: blessing.name,
      description: blessing.description,
      message: blessing.message,
      expiresAt: blessing.expiresAt.toISOString(),
      createdAt: blessing.createdAt.toISOString(),
      recipient: {
        id: recipient.id,
        code: recipient.code,
        fullName: recipient.fullName,
      },
    };
  }
}
