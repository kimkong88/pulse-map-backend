import { Prisma } from '../../prisma/generated/prisma/client';
import { prisma } from '../prisma/client';

export const createBlessing = async (data: Prisma.BlessingCreateInput) => {
  const blessing = await prisma.blessing.create({
    data,
  });
  return blessing;
};

export const findBlessingSentToday = async (
  userId: string,
  resetTime: Date,
) => {
  const blessing = await prisma.blessing.findFirst({
    where: {
      sentById: userId,
      createdAt: {
        gte: resetTime,
      },
    },
  });
  return blessing;
};

export const findActiveBlessingsReceived = async (userId: string) => {
  const now = new Date();
  const blessings = await prisma.blessing.findMany({
    where: {
      receivedById: userId,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      sentBy: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return blessings;
};

export const findAllBlessingsReceived = async (userId: string) => {
  const blessings = await prisma.blessing.findMany({
    where: {
      receivedById: userId,
    },
    include: {
      sentBy: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return blessings;
};
