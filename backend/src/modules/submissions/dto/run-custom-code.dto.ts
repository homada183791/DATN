import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Language } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunCustomCodeDto {
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

  @ApiProperty({
    description: 'Mã nguồn cần chạy thử',
    example:
      '#include <iostream>\nusing namespace std;\nint main() {\n  int a, b;\n  cin >> a >> b;\n  cout << a + b;\n  return 0;\n}',
  })
  @IsString()
  @IsNotEmpty({ message: 'Source code không được để trống' })
  source_code: string;

  @ApiPropertyOptional({
    description: 'Input tuỳ chọn của người dùng (stdin)',
    example: '5 3',
    default: '',
  })
  @IsString()
  @IsOptional()
  custom_input?: string;
}
