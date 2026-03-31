import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('orchestrator')
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new conversation session' })
  async start(@Body() dto: StartSessionDto) {
    return this.orchestrator.startSession(dto.businessId, dto.callerPhone);
  }

  @Post(':sessionId/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a user message and get assistant response' })
  @ApiParam({ name: 'sessionId', type: String })
  async message(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.orchestrator.handleMessage(sessionId, dto.userMessage);
  }

  @Get(':sessionId/state')
  @ApiOperation({ summary: 'Get current session state' })
  @ApiParam({ name: 'sessionId', type: String })
  async state(@Param('sessionId') sessionId: string) {
    return this.orchestrator.getState(sessionId);
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close the session and get final summary' })
  @ApiParam({ name: 'sessionId', type: String })
  async close(@Param('sessionId') sessionId: string) {
    return this.orchestrator.closeSession(sessionId);
  }
}