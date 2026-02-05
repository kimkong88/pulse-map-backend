import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendBlessingDto {
  @IsString()
  recipientCode: string; // User code to send blessing to

  @IsString()
  emoji: string; // Blessing template emoji

  @IsString()
  name: string; // Blessing template name

  @IsString()
  description: string; // Blessing template description

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Message must be less than 500 characters' })
  message?: string; // Optional user message
}
