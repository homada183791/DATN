import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'))
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Request() req, @Body() createSubmissionDto: CreateSubmissionDto) {
    // JWT Strategy trả về userId thông qua payload.sub
    const userId = req.user.userId;
    return this.submissionsService.submitCode(userId, createSubmissionDto);
  }
}
