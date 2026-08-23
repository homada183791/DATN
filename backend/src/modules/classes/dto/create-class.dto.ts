import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ description: 'Tên lớp học', example: 'Lập trình C++ Cơ bản' })
  @IsNotEmpty({ message: 'Tên lớp học không được để trống' })
  @IsString()
  @MaxLength(255, { message: 'Tên lớp học không được vượt quá 255 ký tự' })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả lớp học', example: 'Lớp học dành cho người mới bắt đầu' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' })
  description?: string;
}
