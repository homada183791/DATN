import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('problems')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  // POST: Chỉ ADMIN
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createProblemDto: CreateProblemDto) {
    return this.problemsService.create(createProblemDto);
  }

  // GET ALL: Mọi User đã login
  @Get()
  findAll() {
    return this.problemsService.findAll();
  }

  // GET ONE: Mọi User đã login
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { role: Role } }) {
    return this.problemsService.findOne(id, req.user.role);
  }

  // PUT: Chỉ ADMIN
  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateProblemDto: UpdateProblemDto) {
    return this.problemsService.update(id, updateProblemDto);
  }

  // DELETE: Chỉ ADMIN
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.problemsService.remove(id);
  }
}
