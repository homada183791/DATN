import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Language } from '@prisma/client';

export class CreateSubmissionDto {
  @IsUUID(undefined, { message: 'Mã bài tập (problem_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài tập không được để trống' })
  problem_id: string;

  @IsEnum(Language, { message: 'Ngôn ngữ lập trình không hợp lệ (hỗ trợ C, CPP, PYTHON, GO, JAVA)' })
  @IsNotEmpty({ message: 'Ngôn ngữ lập trình không được để trống' })
  language: Language;

  @IsString()
  @IsNotEmpty({ message: 'Source code không được để trống' })
  source_code: string;
}
