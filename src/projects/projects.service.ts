import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createProject(createProjectDto: CreateProjectDto, ownerId: number): Promise<Project> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create project
      const project = this.projectRepository.create({
        ...createProjectDto,
        ownerId,
        status: 'active' as any,
      });

      const savedProject = await queryRunner.manager.save(project);

      // Add owner as project member with admin role
      const projectMember = this.projectMemberRepository.create({
        projectId: savedProject.id,
        userId: ownerId,
        role: ProjectRole.ADMIN,
        isActive: true,
      });

      await queryRunner.manager.save(projectMember);

      await queryRunner.commitTransaction();
      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllProjects(userId: number, page: number = 1, limit: number = 10): Promise<{ projects: Project[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get projects where user is owner or member
    const [projects, total] = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project_members', 'pm', 'pm.projectId = project.id AND pm.userId = :userId', { userId })
      .where('project.ownerId = :userId OR pm.userId = :userId', { userId })
      .andWhere('project.status != :deletedStatus', { deletedStatus: 'deleted' })
      .orderBy('project.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { projects, total };
  }

  async findProjectById(id: number, userId: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, status: 'active' as any },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user has access to this project
    const hasAccess = await this.checkProjectAccess(project.id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async updateProject(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project> {
    const project = await this.findProjectById(id, userId);

    // Check if user is owner or admin
    const isOwner = project.ownerId === userId;
    const isAdmin = await this.isProjectAdmin(project.id, userId);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only project owner or admin can update project');
    }

    // Update project
    Object.assign(project, updateProjectDto);
    return await this.projectRepository.save(project);
  }

  // ========== SOFT DELETE METHODS ==========

  async softDeleteProject(id: number, userId: number): Promise<{ message: string }> {
    const project = await this.findProjectById(id, userId);

    // Only owner can delete project
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only project owner can delete project');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Soft delete project
      project.status = 'deleted' as any;
      await queryRunner.manager.save(project);

      // 2. Soft delete all project members
      await queryRunner.manager.update(
        'project_members',
        { projectId: id, isActive: true },
        { isActive: false, leftAt: new Date() }
      );

      // 3. Soft delete all kanban boards
      await queryRunner.manager.update(
        'kanban_boards',
        { projectId: id, isActive: true },
        { isActive: false }
      );

      // 4. Soft delete all kanban columns (through boards)
      const boards = await queryRunner.manager.find('kanban_boards', {
        where: { projectId: id }
      });
      
      if (boards.length > 0) {
        const boardIds = boards.map(board => (board as any).id);
        await queryRunner.manager.update(
          'kanban_columns',
          { boardId: boardIds as any, isActive: true },
          { isActive: false }
        );
      }

      // 5. Soft delete all tasks
      await queryRunner.manager.update(
        'tasks',
        { projectId: id, deletedAt: null },
        { deletedAt: new Date() }
      );

      // 6. Archive all project-related notifications
      await queryRunner.manager.update(
        'notifications',
        { projectId: id, status: 'unread' },
        { status: 'archived', archivedAt: new Date() }
      );

      await queryRunner.commitTransaction();
      return { message: 'Project and all related data soft deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== HARD DELETE METHODS ==========

  async hardDeleteProject(id: number, userId: number): Promise<{ message: string }> {
    const project = await this.findProjectById(id, userId);

    // Only owner can delete project
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only project owner can delete project');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Hard delete all project members
      await queryRunner.manager.delete(
        'project_members',
        { projectId: id }
      );

      // 2. Hard delete all kanban boards (and their columns, tasks)
      const boards = await queryRunner.manager.find('kanban_boards', {
        where: { projectId: id }
      });
      
      if (boards.length > 0) {
        const boardIds = boards.map(board => (board as any).id);
        
        // Hard delete all tasks in all boards
        await queryRunner.manager.delete(
          'tasks',
          { boardId: boardIds as any }
        );
        
        // Hard delete all columns in all boards
        await queryRunner.manager.delete(
          'kanban_columns',
          { boardId: boardIds as any }
        );
        
        // Hard delete all boards
        await queryRunner.manager.delete(
          'kanban_boards',
          { projectId: id }
        );
      }

      // 3. Hard delete all tasks directly linked to project
      await queryRunner.manager.delete(
        'tasks',
        { projectId: id }
      );

      // 4. Hard delete all project-related notifications
      await queryRunner.manager.delete(
        'notifications',
        { projectId: id }
      );

      // 5. Hard delete the project itself
      await queryRunner.manager.delete(
        'projects',
        { id: id }
      );

      await queryRunner.commitTransaction();
      return { message: 'Project and all related data hard deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== LEGACY METHOD (for backward compatibility) ==========

  async deleteProject(id: number, userId: number): Promise<{ message: string }> {
    // Default to soft delete for backward compatibility
    return this.softDeleteProject(id, userId);
  }

  async addProjectMember(projectId: number, memberUserId: number, role: ProjectRole, currentUserId: number): Promise<{ message: string }> {
    const project = await this.findProjectById(projectId, currentUserId);

    // Check if current user is owner or admin
    const isOwner = project.ownerId === currentUserId;
    const isAdmin = await this.isProjectAdmin(projectId, currentUserId);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only project owner or admin can add members');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: memberUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: memberUserId },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    // Add member
    const projectMember = this.projectMemberRepository.create({
      projectId,
      userId: memberUserId,
      role,
      isActive: true,
    });

    await this.projectMemberRepository.save(projectMember);

    // Send notification to the added member
    await this.notificationsService.createProjectMemberAddedNotification(
      memberUserId,
      projectId,
      currentUserId,
      role,
    );

    return { message: 'Member added successfully' };
  }

  async removeProjectMember(projectId: number, memberUserId: number, currentUserId: number): Promise<{ message: string }> {
    const project = await this.findProjectById(projectId, currentUserId);

    // Check if current user is owner or admin
    const isOwner = project.ownerId === currentUserId;
    const isAdmin = await this.isProjectAdmin(projectId, currentUserId);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only project owner or admin can remove members');
    }

    // Cannot remove owner
    if (project.ownerId === memberUserId) {
      throw new ForbiddenException('Cannot remove project owner');
    }

    // Remove member
    await this.projectMemberRepository.update(
      { projectId, userId: memberUserId },
      { isActive: false }
    );

    // Send notification to the removed member
    await this.notificationsService.createProjectMemberRemovedNotification(
      memberUserId,
      projectId,
      currentUserId,
    );

    return { message: 'Member removed successfully' };
  }

  async getProjectMembers(projectId: number, userId: number): Promise<{ members: any[] }> {
    await this.findProjectById(projectId, userId);

    const members = await this.projectMemberRepository
      .createQueryBuilder('pm')
      .leftJoin('users', 'u', 'u.id = pm.userId')
      .select([
        'pm.id',
        'pm.userId',
        'pm.role',
        'pm.isActive',
        'pm.joinedAt',
        'u.username',
        'u.email',
        'u.fullName',
        'u.avatar',
      ])
      .where('pm.projectId = :projectId', { projectId })
      .andWhere('pm.isActive = :isActive', { isActive: true })
      .getRawMany();

    return { members };
  }

  private async checkProjectAccess(projectId: number, userId: number): Promise<boolean> {
    // Check if user is owner
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (project?.ownerId === userId) {
      return true;
    }

    // Check if user is a member
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId, isActive: true },
    });

    return !!member;
  }

  private async isProjectAdmin(projectId: number, userId: number): Promise<boolean> {
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId, isActive: true },
    });

    return member?.role === ProjectRole.ADMIN;
  }
}
