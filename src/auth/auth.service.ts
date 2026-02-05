import { Platform } from 'prisma/generated/prisma/enums';
import { AuthenticateDto } from './auth.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as accountsRepository from '../repositories/accounts.repository';
import * as usersRepository from '../repositories/users.repository';
import { Account, User } from 'prisma/generated/prisma/client';
import { TokensService } from '../tokens/tokens.service';
import { TokenType } from 'prisma/generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokensService: TokensService,
  ) {}

  async authenticate(authenticateDto: AuthenticateDto, userId?: string) {
    // If userId exists → Ghost user signing up (link to new account)
    // If userId is undefined → Existing user signing in
    if (userId) {
      return this.signUp(authenticateDto, userId);
    } else {
      return this.signIn(authenticateDto);
    }
  }

  private async signIn(authenticateDto: AuthenticateDto) {
    const { token, provider } = authenticateDto;

    // Decode OAuth token to get user info
    const decodedToken = this.decodeOAuthToken(token, provider);

    // Check if account exists
    const account = await accountsRepository.findAccountByPlatformAndEmail(
      provider,
      decodedToken.email,
    );

    if (!account) {
      throw new NotFoundException('account_not_found');
    }

    // Get all users linked to this account
    const users = await usersRepository.findUsersByAccountId(account.id);

    if (!users || users.length === 0) {
      throw new NotFoundException('no_users_found');
    }

    // Get primary user or first user
    const primaryUser = users.find((u) => u.isPrimary) || users[0];

    // Generate tokens for the primary user
    const tokens = await this.tokensService.generateAuthTokens(primaryUser.id);

    return {
      account: {
        id: account.id,
        email: account.email,
        platform: account.platform,
      },
      user: primaryUser,
      users,
      tokens,
      action: 'sign_in',
    };
  }

  private async signUp(authenticateDto: AuthenticateDto, userId: string) {
    const { token, provider } = authenticateDto;

    // Decode OAuth token to get user info
    const decodedToken = this.decodeOAuthToken(token, provider);

    // Check if account already exists
    const existingAccount =
      await accountsRepository.findAccountByPlatformAndEmail(
        provider,
        decodedToken.email,
      );

    if (existingAccount) {
      throw new ConflictException({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'An account with this email already exists',
        action: 'sign_in',
      });
    }

    // Get the current ghost user
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Check if user is already linked to an account
    if (user.accountId) {
      throw new ConflictException({
        code: 'USER_ALREADY_LINKED',
        message: 'This user is already linked to an account',
      });
    }

    // Create new account and link user
    const account = await accountsRepository.createAccount({
      platform: provider,
      email: decodedToken.email,
      users: {
        connect: { id: userId },
      },
    });

    // Update user to mark as primary (since it's the first/only user)
    await usersRepository.updateUser(userId, {
      isPrimary: true,
    });

    // Refresh user data
    const updatedUser = await usersRepository.findById(userId);

    // Generate new tokens (same user, but now with account context)
    const tokens = await this.tokensService.generateAuthTokens(userId);

    return {
      account: {
        id: account.id,
        email: account.email,
        platform: account.platform,
      },
      user: updatedUser,
      tokens,
      action: 'sign_up',
    };
  }

  private decodeOAuthToken(
    token: string,
    provider: Platform,
  ): { email: string; iss: string } {
    // Decode the OAuth token (without verification for now)
    const decoded = this.jwtService.decode(token) as {
      email: string;
      iss: string;
    };

    if (!decoded || !decoded.email || !decoded.iss) {
      throw new BadRequestException('invalid_token');
    }

    // Verify the issuer matches the provider
    const validIssuers = {
      [Platform.google]: 'https://accounts.google.com',
      [Platform.apple]: 'https://appleid.apple.com',
    };

    if (decoded.iss !== validIssuers[provider]) {
      throw new BadRequestException('invalid_authentication_provider');
    }

    return decoded;
  }

  async validateToken(
    token: string,
  ): Promise<{ account: Account; user: User }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      const account = await accountsRepository.findAccountByUserId(payload.sub);
      const user = await usersRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('invalid_or_expired_token');
      }

      return { account, user };
    } catch (e) {
      throw new UnauthorizedException('invalid_or_expired_token');
    }
  }

  async refreshTokens(refreshToken: string) {
    const token = await this.tokensService.verifyToken(
      refreshToken,
      TokenType.refresh,
    );

    const user = await usersRepository.findById(token.userId);

    if (!user) {
      throw new BadRequestException('user_not_found');
    }
    await this.tokensService.deleteToken(refreshToken, TokenType.refresh);
    const tokens = await this.tokensService.generateAuthTokens(user.id);

    return { user, tokens };
  }
}
