import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('contests')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':id/leaderboard')
  @UseGuards(AuthGuard('jwt'))
  getLeaderboard(@Param('id') id: string) {
    return this.leaderboardService.getLeaderboard(id);
  }
}
