import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStudentDto {
  @ApiProperty({ description: 'ID của sinh viên', example: 'uuid-1234' })
  @IsNotEmpty({ message: 'ID của sinh viên không được để trống' })
  @IsString()
  @IsUUID('all', { message: 'ID sinh viên phải là định dạng UUID' })
  student_id: string;
}
