import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { AddProblemDto } from './dto/add-problem.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/contests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createContestDto: CreateContestDto) {
    return this.contestsService.create(createContestDto);
  }

  @Get()
  // Không gán Roles -> Bất kỳ ai có JWT đều xem được
  findAll() {
    return this.contestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contestsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateContestDto: UpdateContestDto) {
    return this.contestsService.update(id, updateContestDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.contestsService.remove(id);
  }

  @Post(':id/problems')
  @Roles(Role.ADMIN)
  addProblem(@Param('id') id: string, @Body() addProblemDto: AddProblemDto) {
    return this.contestsService.addProblem(id, addProblemDto);
  }
}
