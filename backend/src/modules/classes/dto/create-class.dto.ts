import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty({ message: 'Tên lớp học không được để trống' })
  @IsString()
  @MaxLength(255, { message: 'Tên lớp học không được vượt quá 255 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' })
  description?: string;
}
