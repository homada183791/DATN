import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { IsAfter } from '../../../common/validators/is-after.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContestDto {
  @ApiProperty({ example: 'Kỳ thi HSG Quốc gia 2024', description: 'Tên của kỳ thi' })
  @IsString()
  @IsNotEmpty({ message: 'Tên kỳ thi không được để trống' })
  title: string;

  @ApiPropertyOptional({ example: 'Kỳ thi chọn học sinh giỏi quốc gia môn Tin học', description: 'Mô tả chi tiết về kỳ thi' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2024-12-25T08:00:00Z', description: 'Thời gian bắt đầu kỳ thi theo định dạng ISO8601' })
  @IsDateString({}, { message: 'start_time phải là định dạng ISO8601 Date' })
  @IsNotEmpty({ message: 'Thời gian bắt đầu không được để trống' })
  start_time: string;

  @ApiProperty({ example: '2024-12-25T11:00:00Z', description: 'Thời gian kết thúc kỳ thi theo định dạng ISO8601' })
  @IsDateString({}, { message: 'end_time phải là định dạng ISO8601 Date' })
  @IsNotEmpty({ message: 'Thời gian kết thúc không được để trống' })
  @IsAfter('start_time', { message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' })
  end_time: string;
}
