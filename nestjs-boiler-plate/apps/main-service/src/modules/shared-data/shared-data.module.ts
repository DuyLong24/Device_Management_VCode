
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedDataController } from './controllers/shared-data.controller';
import { SharedDataService } from './services/shared-data.service';
import { SharedDataRepository } from './repositories/shared-data.repository';
import { SharedData, SharedDataSchema, SharedDataGroup, SharedDataGroupSchema } from './schemas/shared-data.schemas';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SharedData.name, schema: SharedDataSchema },
            { name: SharedDataGroup.name, schema: SharedDataGroupSchema },
        ]),
    ],
    controllers: [SharedDataController],
    providers: [SharedDataService, SharedDataRepository],
    exports: [SharedDataService, SharedDataRepository],
})
export class SharedDataModule { }
