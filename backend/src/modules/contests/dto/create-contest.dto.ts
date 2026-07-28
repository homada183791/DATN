import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { IsAfter } from '../../../common/validators/is-after.validator';

export class CreateContestDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên kỳ thi không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'start_time phải là định dạng ISO8601 Date' })
  @IsNotEmpty({ message: 'Thời gian bắt đầu không được để trống' })
  start_time: string;

  @IsDateString({}, { message: 'end_time phải là định dạng ISO8601 Date' })
  @IsNotEmpty({ message: 'Thời gian kết thúc không được để trống' })
  @IsAfter('start_time', { message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' })
  end_time: string;
}
