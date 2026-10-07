import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({
    description: 'Điểm số do giảng viên chấm (thang điểm 0 - 100 hoặc 0 - 10)',
    example: 9.5,
  })
  @IsNumber({}, { message: 'Điểm số phải là số hợp lệ' })
  @Min(0, { message: 'Điểm số tối thiểu là 0' })
  @Max(100, { message: 'Điểm số tối đa là 100' })
  @IsNotEmpty({ message: 'Điểm số không được để trống' })
  instructor_score: number;

  @ApiPropertyOptional({
    description: 'Lời nhận xét, góp ý sư phạm hoặc nhận xét code của giảng viên',
    example: 'Thuật toán tối ưu, code sạch sẽ và có chú thích rõ ràng.',
  })
  @IsOptional()
  @IsString({ message: 'Lời nhận xét phải là chuỗi văn bản' })
  instructor_feedback?: string;
}
