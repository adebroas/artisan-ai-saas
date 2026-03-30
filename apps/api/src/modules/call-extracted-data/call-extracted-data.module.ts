import { Module } from '@nestjs/common';
import { CallExtractedDataController } from './call-extracted-data.controller';
import { CallExtractedDataService } from './call-extracted-data.service';

@Module({
  controllers: [CallExtractedDataController],
  providers: [CallExtractedDataService],
  exports: [CallExtractedDataService],
})
export class CallExtractedDataModule {}