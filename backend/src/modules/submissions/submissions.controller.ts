import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/submissions')
@UseGuards(AuthGuard('jwt'))
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  create(@Request() req, @Body() createSubmissionDto: CreateSubmissionDto) {
    // JWT Strategy trả về userId thông qua payload.sub
    const userId = req.user.userId;
    return this.submissionsService.submitCode(userId, createSubmissionDto);
  }
}
