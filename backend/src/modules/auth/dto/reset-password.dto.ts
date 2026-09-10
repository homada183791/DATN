import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Mã xác nhận không được để trống' })
  @Length(6, 6, { message: 'Mã xác nhận phải gồm 6 chữ số' })
  code: string;

  @IsString({ message: 'Token reset phải là chuỗi' })
  @IsNotEmpty({ message: 'Token reset không được để trống' })
  token: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}
