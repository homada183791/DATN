import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddStudentDto {
  @IsNotEmpty({ message: 'ID của sinh viên không được để trống' })
  @IsString()
  @IsUUID('all', { message: 'ID sinh viên phải là định dạng UUID' })
  student_id: string;
}
