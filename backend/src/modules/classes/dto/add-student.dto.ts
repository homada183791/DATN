import { IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'MSSV của sinh viên (8 chữ số)', example: '20120001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'MSSV phải gồm đúng 8 chữ số (0-9)' })
  student_code?: string;
}