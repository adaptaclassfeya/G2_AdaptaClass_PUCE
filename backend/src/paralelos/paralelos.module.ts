import { Module } from '@nestjs/common';
import { ParalelosService } from './paralelos.service';
import { ParalelosController } from './paralelos.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ParalelosController],
  providers: [ParalelosService],
  exports: [ParalelosService],
})
export class ParalelosModule {}
