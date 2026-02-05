import { Prisma } from '../../prisma/generated/prisma/client';
import { prisma } from '../prisma/client';

export const createAccount = async (data: Prisma.AccountCreateInput) => {
  const account = await prisma.account.create({
    data,
  });
  return account;
};

export const findAccountByUserId = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      users: {
        some: { id: userId },
      },
    },
  });
  return account;
};

export const connectAccount = async (userId: string, accountId: string) => {
  const account = await prisma.account.update({
    where: { id: accountId },
    data: {
      users: {
        connect: {
          id: userId,
        },
      },
    },
  });
  return account;
};

export const findAccountByPlatformAndEmail = async (
  platform: string,
  email: string,
) => {
  const account = await prisma.account.findUnique({
    where: {
      platform_email: {
        platform: platform as any,
        email,
      },
    },
  });
  return account;
};
