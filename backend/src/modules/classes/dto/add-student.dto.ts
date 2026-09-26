import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddStudentDto {
  @ApiPropertyOptional({ description: 'ID của sinh viên', example: 'uuid-1234' })
  @IsOptional()
  @IsString()
  @IsUUID('all', { message: 'ID sinh viên phải là định dạng UUID' })
  student_id?: string;

  @ApiPropertyOptional({ description: 'Email của sinh viên', example: 'student@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email sinh viên không hợp lệ' })
  email?: string;
}
