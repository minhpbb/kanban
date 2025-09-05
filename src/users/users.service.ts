import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserProfileDto, ChangePasswordDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ========== PROFILE METHODS ==========

  async getUserProfile(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'fullName', 'avatar', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserProfile(userId: number, updateUserProfileDto: UpdateUserProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is already taken by another user
    if (updateUserProfileDto.email && updateUserProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserProfileDto.email }
      });
      if (existingUser) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Update user profile
    Object.assign(user, updateUserProfileDto);
    await this.userRepository.save(user);

    // Return updated user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.userRepository.update(userId, { password: hashedNewPassword });

    return { message: 'Password changed successfully' };
  }

  // ========== SOFT DELETE METHODS ==========

  async softDeleteUser(userId: number, currentUserId: number): Promise<{ message: string }> {
    // Users cannot delete themselves
    if (userId === currentUserId) {
      throw new ForbiddenException('Users cannot delete themselves');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Soft delete user
      user.deletedAt = new Date();
      user.isActive = false;
      await queryRunner.manager.save(user);

      // 2. Soft delete all projects owned by this user
      await queryRunner.manager.update(
        'projects',
        { ownerId: userId, status: 'active' },
        { status: 'deleted' }
      );

      // 3. Soft delete all project memberships
      await queryRunner.manager.update(
        'project_members',
        { userId: userId, isActive: true },
        { isActive: false, leftAt: new Date() }
      );

      // 4. Soft delete all tasks created by this user
      await queryRunner.manager.update(
        'tasks',
        { createdById: userId, deletedAt: null },
        { deletedAt: new Date() }
      );

      // 5. Soft delete all tasks assigned to this user
      await queryRunner.manager.update(
        'tasks',
        { assigneeId: userId, deletedAt: null },
        { deletedAt: new Date() }
      );

      // 6. Archive all notifications for this user
      await queryRunner.manager.update(
        'notifications',
        { userId: userId, status: 'unread' },
        { status: 'archived', archivedAt: new Date() }
      );

      // 7. Revoke all refresh tokens
      await queryRunner.manager.update(
        'refresh_tokens',
        { userId: userId, isRevoked: false },
        { isRevoked: true }
      );

      await queryRunner.commitTransaction();
      return { message: 'User and all related data soft deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== HARD DELETE METHODS ==========

  async hardDeleteUser(userId: number, currentUserId: number): Promise<{ message: string }> {
    // Users cannot delete themselves
    if (userId === currentUserId) {
      throw new ForbiddenException('Users cannot delete themselves');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Hard delete all projects owned by this user (cascade delete)
      const projects = await queryRunner.manager.find('projects', {
        where: { ownerId: userId }
      });

      for (const project of projects) {
        const projectId = (project as any).id;
        
        // Delete all project members
        await queryRunner.manager.delete('project_members', { projectId });
        
        // Delete all boards and their columns, tasks
        const boards = await queryRunner.manager.find('kanban_boards', {
          where: { projectId }
        });
        
        for (const board of boards) {
          const boardId = (board as any).id;
          // Delete all tasks in board
          await queryRunner.manager.delete('tasks', { boardId });
          // Delete all columns in board
          await queryRunner.manager.delete('kanban_columns', { boardId });
        }
        
        // Delete all boards
        await queryRunner.manager.delete('kanban_boards', { projectId });
        // Delete all tasks directly linked to project
        await queryRunner.manager.delete('tasks', { projectId });
        // Delete all notifications
        await queryRunner.manager.delete('notifications', { projectId });
      }
      
      // Delete all projects
      await queryRunner.manager.delete('projects', { ownerId: userId });

      // 2. Hard delete all project memberships
      await queryRunner.manager.delete('project_members', { userId: userId });

      // 3. Hard delete all tasks created by this user
      await queryRunner.manager.delete('tasks', { createdById: userId });

      // 4. Hard delete all tasks assigned to this user
      await queryRunner.manager.delete('tasks', { assigneeId: userId });

      // 5. Hard delete all notifications for this user
      await queryRunner.manager.delete('notifications', { userId: userId });

      // 6. Hard delete all refresh tokens
      await queryRunner.manager.delete('refresh_tokens', { userId: userId });

      // 7. Hard delete all user roles
      await queryRunner.manager.delete('user_roles', { userId: userId });

      // 8. Hard delete the user itself
      await queryRunner.manager.delete('users', { id: userId });

      await queryRunner.commitTransaction();
      return { message: 'User and all related data hard deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
