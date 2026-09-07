import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddStudentDto } from './dto/add-student.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('classes')
@UseGuards(AuthGuard('jwt'))
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  create(
    @Body() createClassDto: CreateClassDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.classesService.create(createClassDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }

  @Post(':id/students')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  addStudent(@Param('id') id: string, @Body() addStudentDto: AddStudentDto) {
    return this.classesService.addStudent(id, addStudentDto);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Request() req: { user: { userId: string } }) {
    return this.classesService.joinStudent(id, req.user.userId);
  }

  @Delete(':id/leave')
  leave(@Param('id') id: string, @Request() req: { user: { userId: string } }) {
    return this.classesService.removeStudent(id, req.user.userId);
  }

  @Delete(':id/students/:studentId')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.classesService.removeStudent(id, studentId);
  }
}
