import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';
import { FunctionsModule } from '../functions/functions.module.js';

@Module({
  imports: [FunctionsModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
