import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class JudgeResultDto {
  @IsUUID(undefined, { message: 'Mã bài nộp (submission_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài nộp không được để trống' })
  submission_id: string;

  @IsEnum(SubmissionStatus, { message: 'Trạng thái chấm bài không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: SubmissionStatus;

  @IsInt({ message: 'Thời gian chạy phải là số nguyên (ms)' })
  @IsOptional()
  execution_time?: number;

  @IsInt({ message: 'Bộ nhớ sử dụng phải là số nguyên (MB)' })
  @IsOptional()
  memory_used?: number;
}
