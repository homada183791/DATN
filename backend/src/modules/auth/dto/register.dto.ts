import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email của người dùng',
    example: 'student@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    description: 'Tên đăng nhập (3-30 ký tự, không chứa ký tự @ hoặc khoảng trắng)',
    example: 'student01',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không được vượt quá 30 ký tự' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, gạch ngang và dấu chấm',
  })
  username?: string;

  @ApiProperty({ description: 'Mật khẩu (ít nhất 6 ký tự)', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ description: 'Mã số sinh viên (đúng 8 chữ số)', example: '20210001' })
  @IsString({ message: 'MSSV không hợp lệ' })
  @IsNotEmpty({ message: 'MSSV không được để trống' })
  @Matches(/^\d{8}$/, { message: 'MSSV phải gồm đúng 8 chữ số (0-9)' })
  student_code: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  full_name?: string;
}