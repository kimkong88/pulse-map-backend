import {
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
  IsISO8601,
  IsOptional,
} from 'class-validator';
import { Gender } from '../../prisma/generated/prisma/enums';

export class SwitchUserDto {
  @IsString()
  userId: string;
}

export class CreateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
    message:
      'birthDate must be in ISO format without timezone (YYYY-MM-DDTHH:mm:ss)',
  })
  birthDate: string;

  @IsString()
  birthLocation: string;

  @IsString()
  birthTimezone: string;

  @IsString()
  currentLocation: string;

  @IsString()
  currentTimezone: string;

  @IsBoolean()
  isTimeKnown: boolean;
}
