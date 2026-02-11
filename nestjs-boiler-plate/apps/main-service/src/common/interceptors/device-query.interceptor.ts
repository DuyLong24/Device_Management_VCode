import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DeviceExportRepository } from '../../modules/device-exports/repositories/device-export.repository';
import { DeviceImportRepository } from '../../modules/device-imports/repositories/device-import.repository';

@Injectable()
export class DeviceQueryInterceptor implements NestInterceptor {
    constructor(
        private readonly deviceExportRepository: DeviceExportRepository,
        private readonly deviceImportRepository: DeviceImportRepository,
    ) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const query = request.query;

        if (!query) {
            return next.handle();
        }

        if (query.exportCode) {
            const exports = await this.deviceExportRepository.findAll({ code: { $regex: query.exportCode, $options: 'i' } });
            if (exports.length > 0) {
                query.exportId = { $in: exports.map(e => e._id) };
            } else {
                query.exportId = '000000000000000000000000'; // Force empty result
            }
            delete query.exportCode;
        }

        if (query.importCode) {
            const imports = await this.deviceImportRepository.findAll({ code: { $regex: query.importCode, $options: 'i' } });
            if (imports.length > 0) {
                query.importId = { $in: imports.map(i => i._id) };
            } else {
                query.importId = '000000000000000000000000'; // Force empty result
            }
            delete query.importCode;
        }

        return next.handle();
    }
}
