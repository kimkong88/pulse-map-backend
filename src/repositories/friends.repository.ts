import {
  Prisma,
  FriendRelationShip,
} from '../../prisma/generated/prisma/client';
import { prisma } from '../prisma/client';

export const addFriend = async (data: Prisma.FriendCreateInput) => {
  const friend = await prisma.friend.create({
    data,
  });
  return friend;
};

export const removeFriend = async (id: string) => {
  const friend = await prisma.friend.delete({
    where: { id },
  });
  return friend;
};

export const findFriendRelationship = async (
  userId: string,
  friendUserId: string,
) => {
  const relationship = await prisma.friend.findFirst({
    where: {
      userId,
      friendUserId,
    },
  });
  return relationship;
};

export const findFriendsByUserId = async (userId: string) => {
  const friends = await prisma.friend.findMany({
    where: {
      userId,
    },
    include: {
      friend: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return friends;
};

export const findFriendById = async (id: string) => {
  const friend = await prisma.friend.findUnique({
    where: { id },
    include: {
      friend: true,
    },
  });
  return friend;
};

export const updateFriendRelationship = async (
  id: string,
  relationship: FriendRelationShip,
) => {
  const friend = await prisma.friend.update({
    where: { id },
    data: { relationship },
  });
  return friend;
};
