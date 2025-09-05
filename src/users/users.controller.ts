import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserProfileDto, ChangePasswordDto } from './dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto
  ) {
    return this.usersService.updateUserProfile(req.user.id, updateUserProfileDto);
  }

  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }
}
