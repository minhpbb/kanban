import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { FileUploadService } from '../common/services/file-upload.service';
import { jwtConfig } from '../config/jwt.config';
import { Action } from '../entities/action.entity';
import { Module } from '../entities/module.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../entities/user.entity';
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, UpdateUserProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User>; message: string }> {
    const { username, email, password, fullName, avatar } = registerDto;

    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('Username already exists');
      }
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      fullName,
      avatar, // Avatar path from DTO
      isActive: true,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign default role (you can modify this logic)
    await this.assignDefaultRole(savedUser.id);

    // Return user without password
    const { password: _, ...userWithoutPassword } = savedUser;
    return {
      user: userWithoutPassword,
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<{ user: Partial<User>; accessToken: string; refreshToken: string }> {
    const { username, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }], // Allow login with username or email
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, refreshToken, ipAddress, userAgent);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress: string, userAgent: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    const payload = this.jwtService.verify(refreshToken, {
      secret: jwtConfig.refreshToken.secret,
    });

    // Check if refresh token exists and is not revoked
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      await this.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.generateTokens(payload.userId);

    // Revoke old refresh token
    await this.revokeRefreshToken(refreshToken);

    // Save new refresh token
    await this.saveRefreshToken(payload.userId, newRefreshToken, ipAddress, userAgent);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedNewPassword });

    // Logout from all devices for security
    await this.logoutAll(userId);

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateUserProfileDto): Promise<{ user: Partial<User>; message: string }> {
    const { fullName, avatar, isEmailVerified } = updateProfileDto;

    // Get current user
    const currentUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // If updating avatar, delete old avatar file
    if (avatar && currentUser.avatar && avatar !== currentUser.avatar) {
      await this.fileUploadService.deleteAvatar(currentUser.avatar);
    }

    // Update user profile
    const updateData: Partial<User> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;

    await this.userRepository.update(userId, updateData);

    // Get updated user
    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
    const { password: _, ...userWithoutPassword } = updatedUser;

    return {
      user: userWithoutPassword,
      message: 'Profile updated successfully',
    };
  }

  async getUserRoles(userId: number): Promise<{ roles: string[] }> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
    });

    if (userRoles.length === 0) {
      return { roles: [] };
    }

    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = await this.roleRepository.find({
      where: { id: roleIds as any },
    });

    return { roles: roles.map(r => r.name) };
  }

  async getUserPermissions(userId: number): Promise<{ permissions: string[] }> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
    });

    if (userRoles.length === 0) {
      return { permissions: [] };
    }

    const roleIds = userRoles.map(ur => ur.roleId);
    
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: roleIds as any },
    });

    if (rolePermissions.length === 0) {
      return { permissions: [] };
    }

    const moduleIds = rolePermissions.map(rp => rp.moduleId);
    const actionIds = rolePermissions.map(rp => rp.actionId);

    const modules = await this.moduleRepository.find({
      where: { id: moduleIds as any },
    });
    const actions = await this.actionRepository.find({
      where: { id: actionIds as any },
    });

    const permissions = rolePermissions.map(rp => {
      const module = modules.find(m => m.id === rp.moduleId);
      const action = actions.find(a => a.id === rp.actionId);
      return module && action ? `${module.name}:${action.name}` : null;
    }).filter(Boolean);

    return { permissions };
  }

  async hasPermission(userId: number, requiredPermission: string): Promise<boolean> {
    const { permissions } = await this.getUserPermissions(userId);
    
    // Check for all:all permission (super admin)
    if (permissions.includes('all:all')) {
      return true;
    }

    // Check for specific permission
    return permissions.includes(requiredPermission);
  }

  private async generateTokens(userId: number): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { userId, sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.accessToken.secret,
      expiresIn: jwtConfig.accessToken.expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshToken.secret,
      expiresIn: jwtConfig.refreshToken.expiresIn,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: number,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  private async assignDefaultRole(userId: number): Promise<void> {
    // Find default role (you can modify this logic)
    const defaultRole = await this.roleRepository.findOne({ where: { name: 'user' } });
    
    if (defaultRole) {
      const userRole = this.userRoleRepository.create({
        userId,
        roleId: defaultRole.id,
      });
      await this.userRoleRepository.save(userRole);
    }
  }
}
