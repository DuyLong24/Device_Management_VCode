import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query, 
  Put, 
  Delete, 
  Param,
  HttpStatus,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // @Permissions('create_user', 'manage_users')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get('by-email')
  async getByEmail(@Query('email') email: string) {
    return this.userService.getByEmail(email);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Patch(':id/set-password')
  async setPassword(@Param('id') id: string, @Body() setPasswordDto: SetPasswordDto) {
    // Override userId từ param để đảm bảo consistency
    setPasswordDto.userId = id;
    return this.userService.setPassword(setPasswordDto);
  }

  @Patch(':id/change-password')
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    // Override userId từ param để đảm bảo consistency
    changePasswordDto.userId = id;
    return this.userService.changePassword(changePasswordDto);
  }

  @Patch(':id/assign-role')
  async assignRole(@Param('id') id: string, @Body() { roleCode }: { roleCode: string }) {
    await this.userService.assignRole(id, roleCode);
    return { message: `Role ${roleCode} assigned successfully` };
  }

  @Patch(':id/remove-role')
  async removeRole(@Param('id') id: string, @Body() { roleCode }: { roleCode: string }) {
    await this.userService.removeRole(id, roleCode);
    return { message: `Role ${roleCode} removed successfully` };
  }
}
