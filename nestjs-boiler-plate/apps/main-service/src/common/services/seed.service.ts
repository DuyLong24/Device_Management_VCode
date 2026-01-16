import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FncRole } from '../../fnc-roles/entities/fnc-role.entity';
import { User } from '../../users/entities/user.entity';
import { WarehouseGroup } from '../../modules/warehouse-groups/schemas/warehouse-group.schemas';
import { Warehouse } from '../../modules/warehouses/schemas/warehouse.schemas';
import { WarehouseTransition } from '../../modules/warehouse-transitions/schemas/warehouse-transition.schemas';
import * as bcrypt from 'bcrypt';
import { WarehouseCode, TransitionType, ActionType } from '../constants/warehouse.constant';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(FncRole.name) private fncRoleModel: Model<FncRole>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(WarehouseGroup.name) private warehouseGroupModel: Model<WarehouseGroup>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<Warehouse>,
    @InjectModel(WarehouseTransition.name) private warehouseTransitionModel: Model<WarehouseTransition>,
  ) { }

  async onModuleInit() {
    this.logger.log('Starting Seed Service...');
    await this.seedRoles();
    await this.seedUsers();
    await this.seedWarehousesAndTransitions();
    this.logger.log('Seed Service Completed.');
  }

  // --- 1. SEED ROLES ---
  private async seedRoles() {
    const roles = [
      { name: 'Super Admin', code: 'super_admin', description: 'Full access' },
      { name: 'Warehouse Staff', code: 'warehouse_staff', description: 'Manage inventory' },
      { name: 'QC Staff', code: 'qc_staff', description: 'Quality control' },
      { name: 'Accountant', code: 'accountant', description: 'View reports' },
    ];

    for (const role of roles) {
      const exists = await this.fncRoleModel.findOne({ code: role.code });
      if (!exists) {
        await this.fncRoleModel.create(role);
        this.logger.log(`Created Role: ${role.name}`);
      }
    }
  }

  // --- 2. SEED USERS ---
  private async seedUsers() {
    const adminRole = await this.fncRoleModel.findOne({ code: 'super_admin' });
    if (!adminRole) return;

    const adminEmail = 'admin@example.com';
    const exists = await this.userModel.findOne({ email: adminEmail });
    if (!exists) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await this.userModel.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        username: 'admin',
        roles: [adminRole._id],
        isActive: true,
      });
      this.logger.log(`Created User: ${adminEmail}`);
    }
  }

  // --- 3. SEED WAREHOUSES & TRANSITIONS (Config-driven) ---
  private async seedWarehousesAndTransitions() {
    const internalGroup = await this.ensureGroup('Kho nội bộ', 1);
    const warrantyGroup = await this.ensureGroup('Kho bảo hành', 2);
    const exportedGroup = await this.ensureGroup('Đã xuất', 3);

    // B. Tạo Warehouses (Logic + UI Config)
    const warehousesData = [
      // 1. Kho Chờ QC
      {
        code: WarehouseCode.PENDING_QC,
        name: 'Chờ QC',
        groupId: internalGroup._id,
        color: 'blue',
        orderIndex: 1,
        icon: 'clock-circle',
        config: {
          columns: ['serial', 'name', 'model', 'importDate'],
          actions: [ActionType.SCAN, ActionType.QC_BATCH],
          quickTransfers: [
            { to: WarehouseCode.READY_TO_EXPORT, label: 'QC Pass', style: 'success' },
            { to: WarehouseCode.DEFECT, label: 'QC Fail', style: 'danger' }
          ]
        }
      },
      // 2. Kho Sẵn sàng xuất
      {
        code: WarehouseCode.READY_TO_EXPORT,
        name: 'Sẵn sàng xuất',
        groupId: internalGroup._id,
        color: 'green',
        orderIndex: 2,
        icon: 'check-circle',
        config: {
          columns: ['serial', 'name', 'model', 'importDate', 'qcStatus'],
          actions: [ActionType.SCAN, ActionType.EXPORT_CREATE, ActionType.TRANSFER],
        }
      },
      // 3. Kho Lỗi
      {
        code: WarehouseCode.DEFECT,
        name: 'Kho Lỗi',
        groupId: internalGroup._id,
        color: 'red',
        orderIndex: 3,
        icon: 'close-circle',
        config: {
          columns: ['serial', 'name', 'qcNote'],
          actions: [ActionType.WARRANTY_SEND],
        }
      },
      // 4. Đang bảo hành
      {
        code: WarehouseCode.IN_WARRANTY,
        name: 'Đang bảo hành NCC',
        groupId: warrantyGroup._id,
        color: 'orange',
        orderIndex: 1,
        icon: 'tool',
        config: {
          columns: ['serial', 'sentDate', 'supplier'],
          actions: ['warranty_receive'],
        }
      },
      // 5. Đã bán
      {
        code: WarehouseCode.SOLD,
        name: 'Đã xuất bán',
        groupId: exportedGroup._id,
        color: 'gray',
        orderIndex: 1,
        icon: 'shopping-cart',
        config: {
          columns: ['serial', 'customer', 'exportDate'],
          actions: [],
        }
      }
    ];

    const whMap: Record<string, any> = {};
    for (const w of warehousesData) {
      const wh = await this.ensureWarehouse(w);
      whMap[w.code] = wh._id;
    }

    // C. Tạo Transitions (Luật chuyển kho)
    const transitionsData = [
      // Import -> Pending QC
      { from: null, to: WarehouseCode.PENDING_QC, type: TransitionType.IMPORT },

      // QC Pass -> Ready
      { from: WarehouseCode.PENDING_QC, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.QC_PASS },

      // QC Fail -> Defect
      { from: WarehouseCode.PENDING_QC, to: WarehouseCode.DEFECT, type: TransitionType.QC_FAIL },

      // Defect -> In Warranty
      { from: WarehouseCode.DEFECT, to: WarehouseCode.IN_WARRANTY, type: TransitionType.SEND_WARRANTY },

      // In Warranty -> Ready (Nhận lại dùng được)
      { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.RECEIVE_WARRANTY },

      // Ready -> Sold (Xuất bán)
      { from: WarehouseCode.READY_TO_EXPORT, to: WarehouseCode.SOLD, type: TransitionType.EXPORT },
    ];

    for (const t of transitionsData) {
      const fromId = t.from ? whMap[t.from] : null;
      const toId = whMap[t.to];
      if ((!fromId && t.from !== null) || !toId) {
        this.logger.warn(`Skipping transition ${t.from} -> ${t.to}: ID not found`);
        continue;
      }
      await this.ensureTransition(fromId, toId, t.type);
    }
  }

  // --- HELPER METHODS ---

  private async ensureGroup(name: string, orderIndex: number) {
    let group = await this.warehouseGroupModel.findOne({ name });
    if (!group) {
      group = await this.warehouseGroupModel.create({
        name,
        orderIndex,
        isActive: true
      });
      this.logger.log(`Created Group: ${name}`);
    }
    return group;
  }

  private async ensureWarehouse(data: any) {
    let wh = await this.warehouseModel.findOne({ code: data.code });
    if (!wh) {
      wh = await this.warehouseModel.create(data);
      this.logger.log(`Created Warehouse: ${data.name}`);
    } else {
      // Update config if exists
      wh.config = data.config;
      wh.groupId = data.groupId;
      wh.color = data.color;
      wh.icon = data.icon;
      await wh.save();
    }
    return wh;
  }

  private async ensureTransition(fromId: any, toId: any, transitionType: string) {
    const all = await this.warehouseTransitionModel.find();

    const exists = all.find((t: any) => {
      const dbFrom = t.fromWarehouseId ? String(t.fromWarehouseId) : 'null';
      const inputFrom = fromId ? String(fromId) : 'null';

      return dbFrom === inputFrom &&
        String(t.toWarehouseId) === String(toId) &&
        t.transitionType === transitionType;
    });

    if (!exists) {
      await this.warehouseTransitionModel.create({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        transitionType: transitionType,
        allowedRoles: ['super_admin', 'warehouse_staff'],
        isActive: true
      });
      this.logger.log(`Created Transition: ${fromId ? fromId : 'NULL'} -> ${toId} [${transitionType}]`);
    }
  }
}