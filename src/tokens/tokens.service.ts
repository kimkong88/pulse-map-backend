import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { add } from 'date-fns';
import * as tokensRepository from '../repositories/tokens.repository';
import { TokenType } from '../../prisma/generated/prisma/enums';

@Injectable()
export class TokensService {
  constructor(private readonly jwtService: JwtService) {}

  decodeToken<T>(token: string) {
    return this.jwtService.decode<T>(token);
  }

  async generateToken(userId: string, expires: number) {
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expires / 1000),
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });
  }

  async verifyToken(token: string, type: TokenType) {
    const foundToken = await tokensRepository.findUnique(token, type);

    if (!foundToken) {
      throw new UnauthorizedException('invalid_token');
    }

    return foundToken;
  }

  async saveToken(
    token: string,
    accountId: string,
    expires: number,
    type: TokenType,
  ) {
    const createdToken = await tokensRepository.createToken(
      token,
      accountId,
      expires,
      type,
    );

    return createdToken;
  }

  async generateAuthTokens(userId: string) {
    const accessTokenExpiration = add(new Date(), {
      hours: Number(process.env.JWT_EXPIRATION_TIME_HOURS),
    });
    const refreshTokenExpiration = add(new Date(), {
      days: Number(process.env.REFRESH_TOKEN_EXPIRATION_TIME_DAYS),
    });

    const accessToken = await this.generateToken(
      userId,
      accessTokenExpiration.getTime(),
    );
    const refreshToken = await this.generateToken(
      userId,
      refreshTokenExpiration.getTime(),
    );

    await this.saveToken(
      refreshToken,
      userId,
      refreshTokenExpiration.getTime(),
      TokenType.refresh,
    );

    return {
      access: {
        token: accessToken,
        expires: accessTokenExpiration.getTime(),
      },
      refresh: {
        token: refreshToken,
        expires: refreshTokenExpiration.getTime(),
      },
    };
  }

  async deleteToken(token: string, type: TokenType) {
    await tokensRepository.deleteToken(token, type);
  }
}
