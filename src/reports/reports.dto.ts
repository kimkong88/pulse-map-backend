import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsISO8601,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

class PersonBirthDataDto {
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
    message:
      'birthDateTime must be in ISO format without timezone (YYYY-MM-DDTHH:mm:ss)',
  })
  birthDateTime: string;

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsString()
  birthTimezone: string;

  @IsBoolean()
  isTimeKnown: boolean;
}

export class CreatePersonalReportDto extends PersonBirthDataDto {
  @IsString()
  @IsOptional()
  name?: string; // Optional: user's name to include in the report
}

class Person1Dto {
  @IsString()
  code: string; // Person1's code (already exists)
}

class Person2Dto {
  @IsString()
  @IsOptional()
  code?: string; // Optional: if provided, fetch existing user; otherwise create new user

  @IsString()
  @IsOptional()
  fullName?: string;

  // All fields below are required ONLY if code is not provided
  @ValidateIf((o) => !o.code)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
    message:
      'birthDateTime must be in ISO format without timezone (YYYY-MM-DDTHH:mm:ss)',
  })
  birthDateTime?: string;

  @ValidateIf((o) => !o.code)
  @IsEnum(['male', 'female'])
  gender?: 'male' | 'female';

  @ValidateIf((o) => !o.code)
  @IsString()
  birthLocation?: string;

  @ValidateIf((o) => !o.code)
  @IsString()
  birthTimezone?: string;

  @ValidateIf((o) => !o.code)
  @IsString()
  currentLocation?: string;

  @ValidateIf((o) => !o.code)
  @IsString()
  currentTimezone?: string;

  @ValidateIf((o) => !o.code)
  @IsBoolean()
  isTimeKnown?: boolean;
}

export class CreateCompatibilityReportDto {
  @ValidateNested()
  @Type(() => Person1Dto)
  person1: Person1Dto;

  @ValidateNested()
  @Type(() => Person2Dto)
  person2: Person2Dto;

  @IsBoolean()
  @IsOptional()
  isTeaser?: boolean; // Default true (free version), false = full premium report
}

export class CreateForecastReportDto {
  @IsString()
  userIdOrCode: string; // User ID or code (immutable, stored as-is in input)

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string; // Optional: specific date (defaults to today/tomorrow based on endpoint)
}