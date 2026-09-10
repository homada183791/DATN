import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyResetCodeDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsNotEmpty({ message: 'Mã xác nhận không được để trống' })
  @Length(6, 6, { message: 'Mã xác nhận phải gồm 6 chữ số' })
  code: string;
}
