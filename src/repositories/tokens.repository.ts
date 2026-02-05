import { prisma } from '../prisma/client';
import { TokenType } from 'prisma/generated/prisma/enums';

export const createToken = async (
  token: string,
  userId: string,
  expires: number,
  type: TokenType,
) => {
  const createdToken = await prisma.token.create({
    data: {
      token,
      userId,
      expires: new Date(expires),
      type,
    },
  });
  return createdToken;
};

export const findUnique = async (token: string, type: TokenType) => {
  const foundToken = await prisma.token.findUnique({
    where: {
      token,
      type,
    },
  });
  return foundToken;
};

export const deleteToken = async (token: string, type: TokenType) => {
  await prisma.token.delete({
    where: {
      token,
      type,
    },
  });
};
