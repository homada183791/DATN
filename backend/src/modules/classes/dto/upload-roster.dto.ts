import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadRosterDto {
  @ApiProperty({ description: 'Danh sách MSSV (8 chữ số) đọc từ cột MSSV của file CSV', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách MSSV không được để trống' })
  @ArrayMaxSize(5000, { message: 'Danh sách tối đa 5000 MSSV' })
  @IsString({ each: true })
  codes: string[];
}