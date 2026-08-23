import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProblemDto {
  @ApiProperty({ description: 'Mã bài tập (UUID)', example: 'uuid-5678' })
  @IsUUID(undefined, { message: 'Mã bài tập (problem_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài tập không được để trống' })
  problem_id: string;
}
