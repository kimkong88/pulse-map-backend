import {
  IsDate,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PersonBirthDataDto {
  @IsDate()
  @Type(() => Date)
  birthDateTime: Date;

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsString()
  birthTimezone: string;

  @IsBoolean()
  isTimeKnown: boolean;
}

export class CreatePersonalReportDto extends PersonBirthDataDto {}

export class CreateCompatibilityReportDto {
  @ValidateNested()
  @Type(() => PersonBirthDataDto)
  person1: PersonBirthDataDto;

  @ValidateNested()
  @Type(() => PersonBirthDataDto)
  person2: PersonBirthDataDto;

  @IsBoolean()
  @IsOptional()
  isTeaser?: boolean; // Default true (free version), false = full premium report
}
