import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateDefectReasonDto } from './dto/create-defect-reason.dto';
import { UpdateDefectReasonDto } from './dto/update-defect-reason.dto';
import { DefectReason, DefectReasonModel } from './schemas/defect-reasons.schemas';

@Injectable()
export class DefectReasonsService {
  constructor(
    @InjectModel(DefectReason.name)
    private readonly defectReasonModel: DefectReasonModel,
  ) { }

  async create(createDto: CreateDefectReasonDto): Promise<DefectReason> {
    const exists = await this.defectReasonModel.findOne({ code: createDto.code });
    if (exists) {
      throw new ConflictException(`Mã lỗi ${createDto.code} đã tồn tại`);
    }
    return this.defectReasonModel.create(createDto);
  }

  async findAll(query: any = {}): Promise<DefectReason[]> {
    return this.defectReasonModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<DefectReason> {
    const reason = await this.defectReasonModel.findById(id).exec();
    if (!reason) {
      throw new NotFoundException(`Không tìm thấy nguyên nhân lỗi ID ${id}`);
    }
    return reason;
  }

  async update(id: string, updateDto: UpdateDefectReasonDto): Promise<DefectReason> {
    const updated = await this.defectReasonModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy nguyên nhân lỗi ID ${id}`);
    }
    return updated;
  }

  async remove(id: string): Promise<DefectReason> {
    const deleted = await this.defectReasonModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy nguyên nhân lỗi ID ${id}`);
    }
    return deleted;
  }
}
