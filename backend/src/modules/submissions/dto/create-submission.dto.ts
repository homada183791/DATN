import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Language } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Mã bài tập', example: 'uuid-5678' })
  @IsUUID(undefined, {
    message: 'Mã bài tập (problem_id) không đúng định dạng UUID',
  })
  @IsNotEmpty({ message: 'Mã bài tập không được để trống' })
  problem_id: string;

  @ApiProperty({
    enum: Language,
    description: 'Ngôn ngữ lập trình',
    example: Language.CPP,
  })
  @IsEnum(Language, {
    message:
      'Ngôn ngữ lập trình không hợp lệ (hỗ trợ C, CPP, PYTHON, GO, JAVA)',
  })
  @IsNotEmpty({ message: 'Ngôn ngữ lập trình không được để trống' })
  language: Language;

  @ApiPropertyOptional({
    description: 'Phiên bản ngôn ngữ cụ thể (ví dụ: CPP17, CPP20, PYTHON3_11, JAVA21, NODE20)',
    example: 'CPP17',
  })
  @IsString()
  @IsOptional()
  language_version?: string;

  @ApiProperty({
    description: 'Mã nguồn (Source code)',
    example:
      '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello World!";\n  return 0;\n}',
  })
  @IsString()
  @IsNotEmpty({ message: 'Source code không được để trống' })
  source_code: string;

  @ApiPropertyOptional({
    description:
      'Mã kỳ thi (chỉ truyền khi nộp bài trong phòng thi). Nếu không truyền, bài nộp được coi là luyện tập tự do.',
    example: 'uuid-contest-1234',
  })
  @IsOptional()
  @IsUUID(undefined, {
    message: 'Mã kỳ thi (contest_id) không đúng định dạng UUID',
  })
  contest_id?: string;
}
