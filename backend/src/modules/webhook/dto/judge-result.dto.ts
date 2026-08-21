import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '@prisma/client';

export class TestResultItemDto {
  @IsInt({ message: 'Thứ tự testcase (index) phải là số nguyên' })
  @IsNotEmpty({ message: 'Thứ tự testcase không được để trống' })
  testcase_index: number;

  @IsEnum(SubmissionStatus, { message: 'Trạng thái testcase không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái testcase không được để trống' })
  status: SubmissionStatus;

  @IsInt({ message: 'Thời gian chạy phải là số nguyên (ms)' })
  @IsOptional()
  execution_time?: number;

  @IsInt({ message: 'Bộ nhớ sử dụng phải là số nguyên (MB)' })
  @IsOptional()
  memory_used?: number;
}

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultItemDto)
  @IsOptional()
  test_results?: TestResultItemDto[];
}
