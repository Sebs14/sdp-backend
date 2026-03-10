import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GrokService } from './grok.service.js';

@Module({
  imports: [HttpModule],
  providers: [GrokService],
  exports: [GrokService],
})
export class GrokModule {}
