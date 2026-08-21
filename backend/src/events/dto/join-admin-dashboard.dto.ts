import { IsNotEmpty, IsUUID } from 'class-validator';

export class JoinAdminDashboardDto {
  @IsUUID(undefined, { message: 'Mã kỳ thi không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã kỳ thi không được để trống' })
  contest_id: string;
}
