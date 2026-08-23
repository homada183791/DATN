import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Language } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Mã bài tập', example: 'uuid-5678' })
  @IsUUID(undefined, { message: 'Mã bài tập (problem_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài tập không được để trống' })
  problem_id: string;

  @ApiProperty({ enum: Language, description: 'Ngôn ngữ lập trình', example: Language.CPP })
  @IsEnum(Language, { message: 'Ngôn ngữ lập trình không hợp lệ (hỗ trợ C, CPP, PYTHON, GO, JAVA)' })
  @IsNotEmpty({ message: 'Ngôn ngữ lập trình không được để trống' })
  language: Language;

  @ApiProperty({ description: 'Mã nguồn (Source code)', example: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello World!";\n  return 0;\n}' })
  @IsString()
  @IsNotEmpty({ message: 'Source code không được để trống' })
  source_code: string;
}
