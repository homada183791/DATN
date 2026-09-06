import { IsNotEmpty, IsUUID } from 'class-validator';

export class JoinSubmissionRoomDto {
  @IsUUID(undefined, {
    message: 'Mã bài nộp (submission_id) không đúng định dạng UUID',
  })
  @IsNotEmpty({ message: 'Mã bài nộp không được để trống' })
  submission_id: string;
}
