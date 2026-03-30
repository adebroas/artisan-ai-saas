import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CallMessagesService } from './call-messages.service';
import { CreateCallMessageDto } from './dto/create-call-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Call Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calls/:callId/messages')
export class CallMessagesController {
  constructor(private readonly callMessagesService: CallMessagesService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Transcript d\'un appel' })
  findByCall(@Param('callId') callId: string) {
    return this.callMessagesService.findByCall(callId);
  }

  @Post()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Ajouter un message (utilisé par l\'agent IA)' })
  create(
    @Param('callId') callId: string,
    @Body() dto: CreateCallMessageDto,
  ) {
    return this.callMessagesService.create(callId, dto);
  }
}