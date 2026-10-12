import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExplainErrorDto {
  @ApiProperty({ description: 'ID lượt nộp bài cần phân tích' })
  @IsNotEmpty({ message: 'Submission ID không được để trống' })
  @IsString()
  submission_id: string;
}
