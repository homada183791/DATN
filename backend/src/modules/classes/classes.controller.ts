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
import { IsNotEmpty, IsString } from 'class-validator';
import { HomeworksService } from '../homeworks/homeworks.service';

class JoinByCodeDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

@Controller('classes')
@UseGuards(AuthGuard('jwt'))
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly homeworksService: HomeworksService,
  ) {}

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

  /** Tham gia lớp bằng ID */
  @Post(':id/join')
  join(@Param('id') id: string, @Request() req: { user: { userId: string } }) {
    return this.classesService.joinStudent(id, req.user.userId);
  }

  /** Tham gia lớp bằng mã mời */
  @Post('join-by-code')
  joinByCode(
    @Body() dto: JoinByCodeDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.classesService.joinByCode(dto.code, req.user.userId);
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

  // ─── Nested homework endpoints ─────────────────────────────────────────

  /** GET /api/v1/classes/:classId/homeworks — danh sách bài tập trong lớp */
  @Get(':classId/homeworks')
  getClassHomeworks(
    @Param('classId') classId: string,
    @Request() req: { user: { userId: string; role: Role } },
  ) {
    return this.homeworksService.findHomeworksByClass(classId, req.user.userId, req.user.role);
  }

  /** GET /api/v1/classes/:classId/homeworks/:homeworkId — chi tiết bài tập */
  @Get(':classId/homeworks/:homeworkId')
  getClassHomework(
    @Param('classId') classId: string,
    @Param('homeworkId') homeworkId: string,
    @Request() req: { user: { userId: string; role: Role } },
  ) {
    return this.homeworksService.findHomeworkByClass(classId, homeworkId, req.user.userId, req.user.role);
  }
}
