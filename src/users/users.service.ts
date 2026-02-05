import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './users.dto';
import * as usersRepository from '../repositories/users.repository';
import * as blessingsRepository from '../repositories/blessings.repository';
import { TokensService } from '../tokens/tokens.service';
import { User } from '../../prisma/generated/prisma/client';
import { generateRandomString } from '../utils/string';
import { SajuService } from '../saju/saju.service';
import { toDate } from 'date-fns-tz';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly ADMIN_USER_CODE = '3456a';

  constructor(
    private readonly tokensService: TokensService,
    private readonly sajuService: SajuService,
  ) {}

  async deleteUser(userId: string, accountId: string, currentUserId: string) {
    // First, verify the user exists and belongs to the account
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Verify the user belongs to the account from the token
    if (user.accountId !== accountId) {
      throw new BadRequestException('user_does_not_belong_to_account');
    }

    // Prevent deleting primary user
    if (user.isPrimary) {
      throw new BadRequestException('primary_user_cannot_be_deleted');
    }

    // Delete the user
    await usersRepository.deleteUser(userId);

    // Determine which user to return tokens for
    const isDeletingSelf = userId === currentUserId;

    if (isDeletingSelf) {
      // If deleting self, return primary user tokens
      const users = await usersRepository.findUsersByAccountId(accountId);
      const primaryUser = users.find((u) => u.isPrimary);

      if (!primaryUser) {
        throw new BadRequestException('primary_user_not_found');
      }

      const tokens = await this.tokensService.generateAuthTokens(
        primaryUser.id,
      );
      return {
        user: primaryUser,
        tokens,
      };
    } else {
      // If deleting another user, return current user tokens (keep existing session)
      const currentUser = await usersRepository.findById(currentUserId);
      if (!currentUser) {
        throw new NotFoundException('current_user_not_found');
      }

      const tokens = await this.tokensService.generateAuthTokens(
        currentUser.id,
      );
      return {
        user: currentUser,
        tokens,
      };
    }
  }

  async switchUser(userId: string, accountId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Verify the user belongs to the account from the token
    if (user.accountId !== accountId) {
      throw new BadRequestException('user_does_not_belong_to_account');
    }

    const tokens = await this.tokensService.generateAuthTokens(user.id);
    return {
      user,
      tokens,
    };
  }

  async createUser(createUserDto: CreateUserDto, accountId?: string) {
    // Convert ISO string to Date object for Prisma
    // Append 'Z' to make it a valid ISO 8601 DateTime that Prisma accepts
    // This stores it as UTC in the DB, but we'll interpret it correctly using birthTimezone when reading
    const birthDate = new Date(createUserDto.birthDate + 'Z');

    // Validate: birth date cannot be in the future
    const now = new Date();
    if (birthDate > now) {
      throw new BadRequestException('birth_date_cannot_be_in_future');
    }

    // Generate unique code for the user
    const code = await this.generateUniqueCode();

    const data = {
      ...createUserDto,
      birthDate, // Use the converted Date object
      accountId: accountId ?? null,
      code,
    };

    if (accountId) {
      const users = await usersRepository.findUsersByAccountId(accountId);
      const MAXIMUM_USERS_PER_ACCOUNT = 5;
      if (users.length === MAXIMUM_USERS_PER_ACCOUNT) {
        throw new BadRequestException('maximum_users_per_account_reached');
      }
      data['isPrimary'] = false;
    } else {
      data['isPrimary'] = true;
    }

    const createdUser = await usersRepository.createUser(data);
    const tokens = await this.tokensService.generateAuthTokens(createdUser.id);

    // Send welcome blessing from admin user
    try {
      await this.sendWelcomeBlessing(createdUser.id);
    } catch (error) {
      // Log error but don't fail user creation if blessing fails
      this.logger.warn(
        `Failed to send welcome blessing to new user ${createdUser.id}: ${error.message}`,
      );
    }

    return {
      user: createdUser,
      tokens,
    };
  }

  /**
   * Send welcome blessing to new user from admin
   */
  private async sendWelcomeBlessing(newUserId: string) {
    // Find admin user by code
    const adminUser = await usersRepository.findByCode(this.ADMIN_USER_CODE);
    if (!adminUser) {
      this.logger.warn(
        `Admin user with code ${this.ADMIN_USER_CODE} not found. Skipping welcome blessing.`,
      );
      return;
    }

    // Create welcome blessing
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await blessingsRepository.createBlessing({
      emoji: '🤝',
      name: "Harmony's Embrace",
      description:
        'Strengthen emotional bonds and create moments of deeper understanding with someone special.',
      message:
        "Welcome! We're excited to have you here. May your journey bring clarity and connection.",
      sentBy: {
        connect: { id: adminUser.id },
      },
      receivedBy: {
        connect: { id: newUserId },
      },
      expiresAt,
    });

    this.logger.log(
      `Welcome blessing sent from admin (${this.ADMIN_USER_CODE}) to new user ${newUserId}`,
    );
  }

  async generateUniqueCode() {
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const code = generateRandomString(6);
      const existingUser = await usersRepository.findByCode(code);
      if (!existingUser) {
        return code;
      }
      attempts++;
    }
    throw new Error('failed_to_generate_unique_code');
  }

  async getUser(userId: string) {
    const user = await usersRepository.findById(userId);
    return user;
  }

  async getUsersByAccountId(user: User, accountId?: string) {
    if (!accountId) {
      return [user];
    }
    const users = await usersRepository.findUsersByAccountId(accountId);
    return users;
  }

  async getUserByCode(code: string) {
    const user = await usersRepository.findByCode(code);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Convert stored date to proper timezone-aware Date object
    const birthDateString = user.birthDate.toISOString().split('.')[0]; // Remove milliseconds and Z
    const birthDate = toDate(birthDateString, { timeZone: user.birthTimezone });

    // Get basic profile (fast, no LLM calls)
    const profile = await this.sajuService.getBasicProfile(
      birthDate,
      user.gender,
      user.birthTimezone,
      user.isTimeKnown,
    );

    return {
      code: user.code,
      identity: {
        code: profile.identity.code,
        title: profile.identity.title,
        element: profile.identity.element,
      },
      rarity: {
        oneIn: profile.rarity.oneIn,
      },
      birthDateTime: birthDateString,
      gender: user.gender,
      birthTimezone: user.birthTimezone,
      isTimeKnown: user.isTimeKnown,
      fullName: user.fullName,
    };
  }
}
