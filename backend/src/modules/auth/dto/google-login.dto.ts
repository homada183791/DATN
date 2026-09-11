import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Access token do Google Identity Services cấp ở phía client sau khi người dùng đăng nhập Google',
  })
  @IsString()
  @IsNotEmpty({ message: 'accessToken không được để trống' })
  accessToken: string;
}