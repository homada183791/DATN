import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Họ và tên người dùng', example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Họ và tên không được quá 100 ký tự' })
  full_name?: string;

  @ApiProperty({ description: 'Tiểu sử / Giới thiệu bản thân', example: 'Đam mê lập trình thi đấu', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Tiểu sử không được quá 500 ký tự' })
  bio?: string;

  @ApiProperty({ description: 'Trường học / Tổ chức', example: 'Đại học Bách Khoa', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Tên trường / tổ chức không được quá 150 ký tự' })
  institution?: string;

  @ApiProperty({ description: 'URL ảnh đại diện', example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ description: 'Cài đặt thông báo (JSON)', required: false })
  @IsOptional()
  @IsObject()
  notification_settings?: Record<string, boolean>;

  @ApiProperty({ description: 'Cài đặt tuỳ chỉnh giao diện / editor (JSON)', required: false })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
