import { Prisma } from '../../prisma/generated/prisma/client';
import { prisma } from '../prisma/client';

export const createUser = async (data: Prisma.UserCreateInput) => {
  const user = await prisma.user.create({
    data,
  });
  return user;
};

export const deleteUser = async (userId: string) => {
  const user = await prisma.user.delete({
    where: { id: userId },
  });
  return user;
};

export const findById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  return user;
};

export const updateUsersByAccountId = async (
  accountId: string,
  data: Prisma.UserUpdateInput,
) => {
  const users = await prisma.user.updateMany({
    where: { accountId },
    data,
  });
  return users;
};

export const findUsersByAccountId = async (accountId: string) => {
  const users = await prisma.user.findMany({
    where: {
      accountId,
    },
  });
  return users;
};

export const updateUser = async (
  userId: string,
  data: Prisma.UserUpdateInput,
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return user;
};

export const findByCode = async (code: string) => {
  const user = await prisma.user.findUnique({
    where: { code },
  });
  return user;
};
