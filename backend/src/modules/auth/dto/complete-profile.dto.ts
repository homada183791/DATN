import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiProperty({ description: 'Tên đăng nhập (chỉ cần khi tài khoản chưa có)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không được vượt quá 30 ký tự' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, gạch ngang và dấu chấm',
  })
  username?: string;

  @ApiProperty({ description: 'Họ và tên (chỉ cần khi tài khoản chưa có)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự' })
  full_name?: string;

  @ApiProperty({ description: 'MSSV gồm đúng 8 chữ số (chỉ cần khi tài khoản chưa có)', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'MSSV phải gồm đúng 8 chữ số (0-9)' })
  student_code?: string;
}