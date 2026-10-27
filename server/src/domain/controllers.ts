import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeviceGuard, UserGuard } from '../auth/auth';
import type { DeviceRequest, UserRequest } from '../auth/auth';
import { IdPipe } from '../http';
import { DomainService } from './domain.service';
import {
  EditRoomDto,
  EmptyDto,
  NameDto,
  ResourceQueryDto,
  RoomDto,
  SampleQueryDto,
  SessionDto,
  SessionQueryDto,
  UploadDto,
} from './dto';
import { ReportService } from './report.service';

@Controller('rooms')
@UseGuards(UserGuard)
export class RoomController {
  constructor(private readonly domain: DomainService) {}
  @Post() create(
    @Req() req: UserRequest,
    @Body() body: RoomDto,
  ): ReturnType<DomainService['createRoom']> {
    return this.domain.createRoom(req.user.id, body);
  }
  @Get() list(
    @Req() req: UserRequest,
    @Query() query: ResourceQueryDto,
  ): ReturnType<DomainService['listRooms']> {
    return this.domain.listRooms(req.user.id, query);
  }
  @Get(':id') get(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
  ): ReturnType<DomainService['getRoom']> {
    return this.domain.getRoom(req.user.id, id);
  }
  @Patch(':id') edit(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: EditRoomDto,
  ): ReturnType<DomainService['changeRoom']> {
    return this.domain.changeRoom(req.user.id, id, body);
  }
  @Post(':id/archive') @HttpCode(200) archive(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: EmptyDto,
  ): ReturnType<DomainService['changeRoom']> {
    void body;
    return this.domain.changeRoom(req.user.id, id, null);
  }
}
@Controller('modules')
@UseGuards(UserGuard)
export class ModuleController {
  constructor(private readonly domain: DomainService) {}
  @Post() create(
    @Req() req: UserRequest,
    @Body() body: NameDto,
  ): ReturnType<DomainService['createModule']> {
    return this.domain.createModule(req.user.id, body);
  }
  @Get() list(
    @Req() req: UserRequest,
    @Query() query: ResourceQueryDto,
  ): ReturnType<DomainService['listModules']> {
    return this.domain.listModules(req.user.id, query);
  }
  @Get(':id') get(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
  ): ReturnType<DomainService['getModule']> {
    return this.domain.getModule(req.user.id, id);
  }
  @Patch(':id') async edit(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: NameDto,
  ): ReturnType<DomainService['getModule']> {
    return (await this.domain.changeModule(req.user.id, id, body)).module;
  }
  @Post(':id/archive') @HttpCode(200) async archive(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: EmptyDto,
  ): ReturnType<DomainService['getModule']> {
    void body;
    return (await this.domain.changeModule(req.user.id, id, 'archive')).module;
  }
  @Post(':id/credentials/rotate') @HttpCode(200) rotate(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: EmptyDto,
  ): ReturnType<DomainService['changeModule']> {
    void body;
    return this.domain.changeModule(req.user.id, id, 'rotate');
  }
}
@Controller('sessions')
@UseGuards(UserGuard)
export class SessionController {
  constructor(
    private readonly domain: DomainService,
    private readonly reports: ReportService,
  ) {}
  @Post() async start(
    @Req() req: UserRequest,
    @Body() body: SessionDto,
    @Headers('idempotency-key') key: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): ReturnType<DomainService['getSession']> {
    const result = await this.domain.start(req.user.id, body, key);
    response.status(result.created ? 201 : 200);
    return result.session;
  }
  @Get() list(
    @Req() req: UserRequest,
    @Query() query: SessionQueryDto,
  ): ReturnType<DomainService['listSessions']> {
    return this.domain.listSessions(req.user.id, query);
  }
  @Get(':id') get(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
  ): ReturnType<DomainService['getSession']> {
    return this.domain.getSession(req.user.id, id);
  }
  @Get(':id/latest') latest(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
  ): ReturnType<DomainService['latest']> {
    return this.domain.latest(req.user.id, id);
  }
  @Get(':id/samples') history(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Query() query: SampleQueryDto,
  ): ReturnType<DomainService['history']> {
    return this.domain.history(req.user.id, id, query);
  }
  @Post(':id/stop') @HttpCode(200) stop(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Body() body: EmptyDto,
  ): ReturnType<DomainService['stop']> {
    void body;
    return this.domain.stop(req.user.id, id);
  }
  @Get(':id/report.pdf') async report(
    @Req() req: UserRequest,
    @Param('id', IdPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const pdf = await this.reports.create(
      await this.domain.getSession(req.user.id, id),
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="photometrix-${id}.pdf"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(pdf);
  }
}
@Controller('device')
@UseGuards(DeviceGuard)
export class DeviceController {
  constructor(private readonly domain: DomainService) {}
  @Get('active-session') active(
    @Req() req: DeviceRequest,
  ): ReturnType<DomainService['activeSession']> {
    return this.domain.activeSession(req.user);
  }
  @Post('measurements') async upload(
    @Req() req: DeviceRequest,
    @Body() body: UploadDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Awaited<ReturnType<DomainService['upload']>>['result']> {
    try {
      const result = await this.domain.upload(req.user, body);
      response.status(result.created ? 201 : 200);
      return result.result;
    } catch (error) {
      response.setHeader('Retry-After', '60');
      throw error;
    }
  }
}
