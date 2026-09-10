import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email của người dùng (hoặc dùng username)',
    example: 'student@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({
    description: 'Tên đăng nhập (hoặc dùng email)',
    example: 'student01',
    required: false,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Mật khẩu', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
