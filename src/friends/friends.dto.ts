import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  FriendRelationShip,
  Gender,
} from '../../prisma/generated/prisma/client';

export class AddFriendDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
    message:
      'birthDate must be in ISO format without timezone (YYYY-MM-DDTHH:mm:ss)',
  })
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  birthLocation?: string;

  @IsString()
  @IsOptional()
  birthTimezone?: string;

  @IsString()
  @IsOptional()
  currentLocation?: string;

  @IsString()
  @IsOptional()
  currentTimezone?: string;

  @IsBoolean()
  @IsOptional()
  isTimeKnown?: boolean;

  @IsEnum(FriendRelationShip)
  relationship: FriendRelationShip;
}

export class UpdateFriendRelationshipDto {
  @IsEnum(FriendRelationShip)
  relationship: FriendRelationShip;
}
