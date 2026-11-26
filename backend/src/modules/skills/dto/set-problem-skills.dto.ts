import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetProblemSkillsDto {
  @ApiProperty({ type: [String], description: 'Mã kỹ năng trong danh mục, vd ["ARRAY_1D","BINARY_SEARCH_ANSWER"]' })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  codes!: string[];
}
