import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DefectReasonsService } from './defect-reasons.service';
import { DefectReasonsController } from './defect-reasons.controller';
import { DefectReason, DefectReasonSchema } from './schemas/defect-reasons.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DefectReason.name, schema: DefectReasonSchema }])
  ],
  controllers: [DefectReasonsController],
  providers: [DefectReasonsService],
  exports: [DefectReasonsService]
})
export class DefectReasonsModule { }
