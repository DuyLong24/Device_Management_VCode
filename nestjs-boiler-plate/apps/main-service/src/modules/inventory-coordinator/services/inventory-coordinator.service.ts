import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DeviceImportRepository } from '../../device-imports/repositories/device-import.repository';
import { InventorySessionRepository } from '../../inventory-sessions/repositories/inventory-session.repository';

@Injectable()
export class InventoryCoordinatorService {
    private readonly logger = new Logger(InventoryCoordinatorService.name);

    constructor(
        private readonly importRepo: DeviceImportRepository,
        private readonly sessionRepo: InventorySessionRepository,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    /**
     * Cập nhật tiến độ nhập kho VÀ tự động complete nếu đủ điều kiện
     * Được gọi từ InventorySession.completeSession()
     */
    async updateProgressAndAutoComplete(
        importId: string,
        data: { serialImported: number; deviceCounts?: Record<string, number> },
        completingSessionId: string,
        userId: string
    ): Promise<void> {
        const mongoSession = await this.connection.startSession();
        mongoSession.startTransaction();

        try {
            const ticket = await this.importRepo.findById(importId);
            if (!ticket) {
                throw new NotFoundException(`Import ticket ${importId} not found`);
            }

            let newStatus = ticket.inventoryStatus;
            if (data.serialImported >= ticket.totalQuantity) {
                newStatus = 'completed';
            } else if (data.serialImported > 0) {
                newStatus = 'in-progress';
            }

            const updatePayload: any = {
                serialImported: data.serialImported,
                inventoryStatus: newStatus
            };

            if (data.deviceCounts) {
                const currentDevices = ticket.devices || [];
                updatePayload.devices = currentDevices.map(d => {
                    const deviceObj = (typeof (d as any).toObject === 'function') ? (d as any).toObject() : d;
                    const additional = data.deviceCounts?.[deviceObj.deviceCode] || 0;
                    if (additional > 0) {
                        return {
                            ...deviceObj,
                            serialImported: (deviceObj.serialImported || 0) + additional
                        };
                    }
                    return deviceObj;
                });
            }

            await this.importRepo.updateWithSession(importId, updatePayload, mongoSession);

            if (data.serialImported >= ticket.totalQuantity) {
                const allSessions = await this.sessionRepo.findAll({ importId });

                const allCompleted = allSessions.every(s =>
                    s.status === 'completed' || String(s._id) === completingSessionId
                );

                if (allCompleted) {
                    await this.importRepo.updateWithSession(importId, {
                        inventoryStatus: 'completed',
                        updatedBy: userId
                    } as any, mongoSession);

                    this.logger.log(`✅ Auto-completed import ${ticket.code}`);
                }
            }

            await mongoSession.commitTransaction();
        } catch (error) {
            await mongoSession.abortTransaction();
            this.logger.error(`Failed to update progress and auto-complete: ${error.message}`);
            throw error;
        } finally {
            await mongoSession.endSession();
        }
    }

    /**
     * Manual complete import (cho admin)
     * Kiểm tra nghiêm ngặt trước khi complete
     */
    async manualCompleteImport(importId: string, userId: string): Promise<any> {
        const ticket = await this.importRepo.findById(importId);

        if (!ticket) {
            throw new NotFoundException(`Import ticket ${importId} not found`);
        }

        if (ticket.inventoryStatus === 'completed') {
            throw new BadRequestException('Phiếu nhập đã hoàn tất');
        }

        if (ticket.serialImported < ticket.totalQuantity) {
            throw new BadRequestException(
                `Chưa đủ số lượng (${ticket.serialImported}/${ticket.totalQuantity})`
            );
        }

        const sessions = await this.sessionRepo.findAll({ importId });
        const hasPending = sessions.some(s => s.status !== 'completed');

        if (hasPending) {
            throw new BadRequestException('Tất cả các phiên kiểm kê phải được hoàn tất trước khi đóng phiếu nhập');
        }

        return this.importRepo.update(importId, {
            inventoryStatus: 'completed',
            updatedBy: userId
        } as any);
    }
}
