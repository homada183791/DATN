import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiFeedbackDto {
  @ApiProperty({
    description: 'interaction_id trả về từ tutor-hint hoặc explain-error',
  })
  @IsNotEmpty()
  @IsString()
  interaction_id: string;

  @ApiProperty({
    enum: [1, -1],
    description: '1 = hữu ích, -1 = không hữu ích',
  })
  @IsInt()
  @IsIn([1, -1])
  value: number;
}
