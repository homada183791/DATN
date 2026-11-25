import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const VIOLATION_REASONS = ['TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'OTHER'] as const;
export type ViolationReason = (typeof VIOLATION_REASONS)[number];

export class ReportViolationDto {
  @ApiPropertyOptional({ enum: VIOLATION_REASONS, description: 'Loại vi phạm' })
  @IsOptional()
  @IsIn(VIOLATION_REASONS as unknown as string[], { message: 'Loại vi phạm không hợp lệ' })
  reason?: ViolationReason;

  @ApiPropertyOptional({ description: 'Bài đang làm khi vi phạm' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  problem_id?: string;
}
