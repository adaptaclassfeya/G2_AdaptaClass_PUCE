import { Module } from '@nestjs/common';
import { AdaptaGService } from './adapta-g.service';
import { AdaptaGController } from './adapta-g.controller';
import { AdaptaGRedisService } from './adapta-g-redis.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdaptaGController],
  providers: [AdaptaGService, AdaptaGRedisService],
})
export class AdaptaGModule {}
