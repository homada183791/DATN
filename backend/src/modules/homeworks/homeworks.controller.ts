import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { HomeworksService } from './homeworks.service';

@Controller('homeworks')
@UseGuards(AuthGuard('jwt'))
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) {}

  @Get()
  findAll(@Request() req: { user: { userId: string; role: Role } }) {
    return this.homeworksService.findAll(req.user.userId, req.user.role);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  create(@Body() dto: CreateHomeworkDto) {
    return this.homeworksService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.homeworksService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.homeworksService.remove(id, req.user.userId);
  }
}