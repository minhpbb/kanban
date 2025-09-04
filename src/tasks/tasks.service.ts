import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from '../entities/task.entity';
import { KanbanBoard } from '../entities/kanban-board.entity';
import { KanbanColumn } from '../entities/kanban-column.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto, ReorderTasksDto, AddCommentDto } from './dto/task.dto';
import { TaskPriority } from '../entities/task.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(KanbanBoard)
    private readonly kanbanBoardRepository: Repository<KanbanBoard>,
    @InjectRepository(KanbanColumn)
    private readonly kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ========== TASK CRUD METHODS ==========

  async createTask(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate project, board, and column access
      await this.validateTaskAccess(createTaskDto.projectId, createTaskDto.boardId, createTaskDto.columnId, userId);

      // Get next order position in column
      const maxOrder = await this.taskRepository
        .createQueryBuilder('task')
        .select('MAX(task.order)', 'maxOrder')
        .where('task.columnId = :columnId', { columnId: createTaskDto.columnId })
        .getRawOne();

      const nextOrder = (maxOrder?.maxOrder || -1) + 1;

      // Create task
      const task = this.taskRepository.create({
        ...createTaskDto,
        createdById: userId,
        order: nextOrder,
        priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
      });

      const savedTask = await queryRunner.manager.save(task);

      await queryRunner.commitTransaction();
      return savedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProjectTasks(projectId: number, userId: number, boardId?: number): Promise<{ tasks: Task[] }> {
    // Check project access
    await this.checkProjectAccess(projectId, userId);

    let query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.projectId = :projectId', { projectId })
      .orderBy('task.order', 'ASC');

    if (boardId) {
      query = query.andWhere('task.boardId = :boardId', { boardId });
    }

    const tasks = await query.getMany();
    return { tasks };
  }

  async getColumnTasks(columnId: number, userId: number): Promise<{ tasks: Task[] }> {
    // Get column and validate access
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.checkProjectAccess(column.boardId, userId);

    const tasks = await this.taskRepository.find({
      where: { columnId, projectId: column.boardId },
      order: { order: 'ASC' },
    });

    return { tasks };
  }

  async getTaskById(taskId: number, userId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check project access
    await this.checkProjectAccess(task.projectId, userId);

    return task;
  }

  async updateTask(taskId: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
    const task = await this.getTaskById(taskId, userId);

    // Check if user can update task
    const canUpdate = await this.checkTaskPermission(task, userId, 'update');
    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    // If changing column, validate new column access
    if (updateTaskDto.columnId && updateTaskDto.columnId !== task.columnId) {
      await this.validateColumnAccess(updateTaskDto.columnId, task.projectId, userId);
    }

    // Check if assignee is being changed
    const oldAssigneeId = task.assigneeId;
    const newAssigneeId = updateTaskDto.assigneeId;

    Object.assign(task, updateTaskDto);
    const savedTask = await this.taskRepository.save(task);

    // Send notifications for assignee changes
    if (oldAssigneeId !== newAssigneeId) {
      if (oldAssigneeId && oldAssigneeId !== userId) {
        // Notify old assignee about unassignment
        await this.notificationsService.createTaskUnassignedNotification(
          oldAssigneeId,
          task.id,
          userId,
        );
      }
      
      if (newAssigneeId && newAssigneeId !== userId) {
        // Notify new assignee about assignment
        await this.notificationsService.createTaskAssignedNotification(
          newAssigneeId,
          task.id,
          userId,
        );
      }
    }

    return savedTask;
  }

  async deleteTask(taskId: number, userId: number): Promise<{ message: string }> {
    const task = await this.getTaskById(taskId, userId);

    // Check if user can delete task
    const canDelete = await this.checkTaskPermission(task, userId, 'delete');
    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    await this.taskRepository.remove(task);
    return { message: 'Task deleted successfully' };
  }

  // ========== DRAG & DROP METHODS ==========

  async moveTask(taskId: number, moveTaskDto: MoveTaskDto, userId: number): Promise<{ message: string }> {
    const task = await this.getTaskById(taskId, userId);

    // Check if user can move task
    const canMove = await this.checkTaskPermission(task, userId, 'move');
    if (!canMove) {
      throw new ForbiddenException('You do not have permission to move this task');
    }

    // Validate target column access
    await this.validateColumnAccess(moveTaskDto.targetColumnId, task.projectId, userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update task column
      task.columnId = moveTaskDto.targetColumnId;

      // Set new order position
      if (moveTaskDto.newOrder !== undefined) {
        task.order = moveTaskDto.newOrder;
      } else {
        // Get next order position in target column
        const maxOrder = await queryRunner.manager
          .createQueryBuilder(Task, 'task')
          .select('MAX(task.order)', 'maxOrder')
          .where('task.columnId = :columnId', { columnId: moveTaskDto.targetColumnId })
          .getRawOne();

        task.order = (maxOrder?.maxOrder || -1) + 1;
      }

      await queryRunner.manager.save(task);

      // Reorder other tasks in the target column if needed
      if (moveTaskDto.newOrder !== undefined) {
        await this.reorderTasksInColumnHelper(queryRunner, moveTaskDto.targetColumnId, taskId, moveTaskDto.newOrder);
      }

      await queryRunner.commitTransaction();
      return { message: 'Task moved successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reorderTasksInColumn(columnId: number, reorderDto: ReorderTasksDto, userId: number): Promise<{ message: string }> {
    // Get column and validate access
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.checkProjectAccess(column.boardId, userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update order for each task
      for (let i = 0; i < reorderDto.taskIds.length; i++) {
        await queryRunner.manager.update(
          Task,
          { id: reorderDto.taskIds[i], columnId },
          { order: i }
        );
      }

      await queryRunner.commitTransaction();
      return { message: 'Tasks reordered successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== COMMENT METHODS ==========

  async addComment(taskId: number, addCommentDto: AddCommentDto, userId: number): Promise<{ message: string }> {
    const task = await this.getTaskById(taskId, userId);

    // Check if user can comment on task
    const canComment = await this.checkTaskPermission(task, userId, 'comment');
    if (!canComment) {
      throw new ForbiddenException('You do not have permission to comment on this task');
    }

    // Generate comment ID
    const commentId = Date.now(); // Simple ID generation

    // Add comment to task
    const comments = task.comments || [];
    comments.push({
      id: commentId,
      userId,
      content: addCommentDto.content,
      createdAt: new Date(),
    });

    task.comments = comments;
    await this.taskRepository.save(task);

    // Send notification to task assignee and creator (if different from commenter)
    const notifyUsers = [task.assigneeId, task.createdById].filter(
      (id) => id && id !== userId
    );

    for (const notifyUserId of notifyUsers) {
      await this.notificationsService.createTaskCommentedNotification(
        notifyUserId,
        taskId,
        userId,
      );
    }

    return { message: 'Comment added successfully' };
  }

  async getTaskComments(taskId: number, userId: number): Promise<{ comments: any[] }> {
    const task = await this.getTaskById(taskId, userId);
    return { comments: task.comments || [] };
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async validateTaskAccess(projectId: number, boardId: number, columnId: number, userId: number): Promise<void> {
    // Check project access
    await this.checkProjectAccess(projectId, userId);

    // Check board access
    const board = await this.kanbanBoardRepository.findOne({
      where: { id: boardId, projectId, isActive: true },
    });

    if (!board) {
      throw new NotFoundException('Board not found or does not belong to project');
    }

    // Check column access
    await this.validateColumnAccess(columnId, projectId, userId);
  }

  private async validateColumnAccess(columnId: number, projectId: number, userId: number): Promise<void> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Check if column belongs to a board in the project
    const board = await this.kanbanBoardRepository.findOne({
      where: { id: column.boardId, projectId, isActive: true },
    });

    if (!board) {
      throw new NotFoundException('Column does not belong to project');
    }
  }

  private async checkProjectAccess(projectId: number, userId: number): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, status: 'active' as any },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner
    if (project.ownerId === userId) {
      return;
    }

    // Check if user is a member
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async checkTaskPermission(task: Task, userId: number, action: 'read' | 'update' | 'delete' | 'move' | 'comment'): Promise<boolean> {
    // Project owner has all permissions
    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
    });

    if (project?.ownerId === userId) {
      return true;
    }

    // Check if user is project admin
    const member = await this.projectMemberRepository.findOne({
      where: { projectId: task.projectId, userId, isActive: true },
    });

    if (member?.role === ProjectRole.ADMIN) {
      return true;
    }

    // Task creator can update/delete their own tasks
    if (task.createdById === userId && (action === 'update' || action === 'delete')) {
      return true;
    }

    // Task assignee can update/comment on assigned tasks
    if (task.assigneeId === userId && (action === 'update' || action === 'comment')) {
      return true;
    }

    // All project members can read and comment
    if (member && (action === 'read' || action === 'comment')) {
      return true;
    }

    return false;
  }

  private async reorderTasksInColumnHelper(queryRunner: any, columnId: number, movedTaskId: number, newOrder: number): Promise<void> {
    // Get all tasks in the column except the moved one
    const tasks = await queryRunner.manager.find(Task, {
      where: { columnId },
      order: { order: 'ASC' },
    });

    // Reorder tasks
    let order = 0;
    for (const task of tasks) {
      if (task.id !== movedTaskId) {
        if (order === newOrder) {
          order++; // Skip the position for the moved task
        }
        task.order = order;
        await queryRunner.manager.save(task);
        order++;
      }
    }
  }
}
