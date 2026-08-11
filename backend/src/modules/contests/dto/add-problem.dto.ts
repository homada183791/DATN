import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddProblemDto {
  @IsUUID(undefined, { message: 'Mã bài tập (problem_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài tập không được để trống' })
  problem_id: string;
}
