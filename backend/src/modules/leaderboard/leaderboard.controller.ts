import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('contests')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':id/leaderboard')
  @UseGuards(AuthGuard('jwt'))
  getLeaderboard(@Param('id') id: string) {
    return this.leaderboardService.getLeaderboard(id);
  }

  @Get(':id/results')
  @Roles(Role.INSTRUCTOR)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getDetailedResults(@Param('id') id: string) {
    return this.leaderboardService.getDetailedResults(id);
  }
}