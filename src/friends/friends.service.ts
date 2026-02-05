import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as friendsRepository from '../repositories/friends.repository';
import { AddFriendDto } from './friends.dto';
import { User } from '../../prisma/generated/prisma/client';
import * as usersRepository from '../repositories/users.repository';
import { UsersService } from 'src/users/users.service';
import { SajuService } from '../saju/saju.service';
import { toDate } from 'date-fns-tz';

@Injectable()
export class FriendsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sajuService: SajuService,
  ) {}
  async removeFriend(userId: string, friendId: string) {
    // friendId is the Friend entity ID, not the target user ID
    const friendRelationship = await friendsRepository.findFriendById(friendId);
    if (!friendRelationship) {
      throw new NotFoundException('friend_not_found');
    }

    // Verify the relationship belongs to the current user
    if (friendRelationship.userId !== userId) {
      throw new BadRequestException('friend_does_not_belong_to_user');
    }

    return friendsRepository.removeFriend(friendId);
  }

  async updateFriendRelationship(
    userId: string,
    friendId: string,
    relationship: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
  ) {
    // friendId is the Friend entity ID
    const friendRelationship = await friendsRepository.findFriendById(friendId);
    if (!friendRelationship) {
      throw new NotFoundException('friend_not_found');
    }

    // Verify the relationship belongs to the current user
    if (friendRelationship.userId !== userId) {
      throw new BadRequestException('friend_does_not_belong_to_user');
    }

    // Update the relationship
    await friendsRepository.updateFriendRelationship(friendId, relationship);

    // Return the updated friend in the same format as getFriends
    const updatedRelationship =
      await friendsRepository.findFriendById(friendId);
    if (!updatedRelationship) {
      throw new NotFoundException('friend_not_found');
    }

    return this.buildFriendObject(userId, updatedRelationship);
  }

  private async buildFriendObject(userId: string, relationship: any) {
    // Get current user data for compatibility calculation
    const currentUser = await usersRepository.findById(userId);
    if (!currentUser) {
      throw new NotFoundException('user_not_found');
    }

    const currentUserBirthDateString = currentUser.birthDate
      .toISOString()
      .split('.')[0]; // Remove milliseconds and Z
    const currentUserBirthDate = toDate(currentUserBirthDateString, {
      timeZone: currentUser.birthTimezone,
    });

    const friendUser = relationship.friend;

    // Convert stored date to proper timezone-aware Date object
    const friendBirthDateString = friendUser.birthDate
      .toISOString()
      .split('.')[0]; // Remove milliseconds and Z
    const friendBirthDate = toDate(friendBirthDateString, {
      timeZone: friendUser.birthTimezone,
    });

    // Get basic profile (fast, no LLM calls)
    const profile = await this.sajuService.getBasicProfile(
      friendBirthDate,
      friendUser.gender,
      friendUser.birthTimezone,
      friendUser.isTimeKnown,
    );

    // Calculate base compatibility score (lightweight, no LLM calls)
    const baseScore = await this.sajuService.getBaseCompatibilityScore(
      {
        birthDateTime: currentUserBirthDate,
        gender: currentUser.gender,
        birthTimezone: currentUser.birthTimezone,
        isTimeKnown: currentUser.isTimeKnown,
      },
      {
        birthDateTime: friendBirthDate,
        gender: friendUser.gender,
        birthTimezone: friendUser.birthTimezone,
        isTimeKnown: friendUser.isTimeKnown,
      },
      relationship.relationship,
    );

    // Calculate daily compatibility (adjusts base score based on today's energy)
    const dailyCompatibility =
      await this.sajuService.calculateDailyCompatibility(
        {
          birthDateTime: currentUserBirthDate,
          gender: currentUser.gender,
          birthTimezone: currentUser.birthTimezone,
          isTimeKnown: currentUser.isTimeKnown,
        },
        {
          birthDateTime: friendBirthDate,
          gender: friendUser.gender,
          birthTimezone: friendUser.birthTimezone,
          isTimeKnown: friendUser.isTimeKnown,
        },
        baseScore,
        relationship.relationship,
        currentUser.currentTimezone || currentUser.birthTimezone,
      );

    return {
      id: relationship.id,
      relationship: relationship.relationship,
      createdAt: relationship.createdAt.toISOString(),
      updatedAt: relationship.updatedAt.toISOString(),
      friend: {
        id: friendUser.id,
        code: friendUser.code,
        fullName: friendUser.fullName,
        identity: {
          code: profile.identity.code,
          title: profile.identity.title,
          element: profile.identity.element,
        },
        rarity: {
          oneIn: profile.rarity.oneIn,
        },
        birthDate: friendBirthDateString,
        gender: friendUser.gender,
      },
      dailyCompatibilityScore: {
        letterGrade: dailyCompatibility.letterGrade,
        insight: dailyCompatibility.insight,
      },
    };
  }

  async getFriends(userId: string) {
    const friendRelationships =
      await friendsRepository.findFriendsByUserId(userId);

    const friends = await Promise.all(
      friendRelationships.map(async (relationship) => {
        return this.buildFriendObject(userId, relationship);
      }),
    );

    return friends;
  }

  async addFriend(userId: string, addFriendDto: AddFriendDto) {
    let friend: User;
    const MAX_FRIENDS = 10;
    const currentUserFriends =
      await friendsRepository.findFriendsByUserId(userId);
    if (currentUserFriends.length >= MAX_FRIENDS) {
      throw new BadRequestException('maximum_friends_reached');
    }
    if (addFriendDto.code) {
      friend = await usersRepository.findByCode(addFriendDto.code);
      if (!friend) {
        throw new NotFoundException('user_not_found');
      }
      if (friend.id === userId) {
        throw new BadRequestException('you_cannot_add_yourself_as_a_friend');
      }
    } else {
      if (
        !addFriendDto.gender ||
        !addFriendDto.birthDate ||
        !addFriendDto.birthLocation ||
        !addFriendDto.birthTimezone ||
        !addFriendDto.currentLocation ||
        !addFriendDto.currentTimezone
      ) {
        throw new BadRequestException('missing_required_fields');
      }
      if (!addFriendDto.isTimeKnown) {
        addFriendDto.isTimeKnown = false;
      }
      const { user } = await this.usersService.createUser(
        {
          fullName: addFriendDto.fullName || 'Anonymous',
          gender: addFriendDto.gender,
          birthDate: addFriendDto.birthDate,
          birthLocation: addFriendDto.birthLocation,
          birthTimezone: addFriendDto.birthTimezone,
          currentLocation: addFriendDto.currentLocation,
          currentTimezone: addFriendDto.currentTimezone,
          isTimeKnown: addFriendDto.isTimeKnown,
        },
        undefined, // No accountId for friend users (ghost users)
      );
      friend = user;
    }

    // Check if relationship already exists
    const existingRelationship = await friendsRepository.findFriendRelationship(
      userId,
      friend.id,
    );
    if (existingRelationship) {
      throw new BadRequestException('friend_already_added');
    }

    return friendsRepository.addFriend({
      user: {
        connect: {
          id: userId,
        },
      },
      friend: {
        connect: {
          id: friend.id,
        },
      },
      relationship: addFriendDto.relationship,
    });
  }
}
