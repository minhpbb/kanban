import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { KanbanBoard } from '../entities/kanban-board.entity';
import { KanbanColumn } from '../entities/kanban-column.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { CreateKanbanBoardDto, UpdateKanbanBoardDto } from './dto/kanban-board.dto';
import { CreateKanbanColumnDto, UpdateKanbanColumnDto, ReorderColumnsDto } from './dto/kanban-column.dto';
import { ColumnType, ColumnColor } from '../entities/kanban-column.entity';

@Injectable()
export class KanbanService {
  constructor(
    @InjectRepository(KanbanBoard)
    private readonly kanbanBoardRepository: Repository<KanbanBoard>,
    @InjectRepository(KanbanColumn)
    private readonly kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
  ) {}

  // ========== KANBAN BOARD METHODS ==========

  async createBoard(projectId: number, createBoardDto: CreateKanbanBoardDto, userId: number): Promise<KanbanBoard> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user has access to project
      await this.checkProjectAccess(projectId, userId);

      // Create board
      const board = this.kanbanBoardRepository.create({
        ...createBoardDto,
        projectId,
        createdById: userId,
        isActive: true,
      });

      const savedBoard = await queryRunner.manager.save(board);

      // Create default columns if specified
      if (createBoardDto.settings?.defaultColumns) {
        await this.createDefaultColumns(queryRunner, savedBoard.id, createBoardDto.settings.defaultColumns);
      }

      await queryRunner.commitTransaction();
      return savedBoard;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProjectBoards(projectId: number, userId: number): Promise<{ boards: KanbanBoard[] }> {
    // Check if user has access to project
    await this.checkProjectAccess(projectId, userId);

    const boards = await this.kanbanBoardRepository.find({
      where: { projectId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return { boards };
  }

  async getBoardById(boardId: number, userId: number): Promise<KanbanBoard> {
    const board = await this.kanbanBoardRepository.findOne({
      where: { id: boardId, isActive: true },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if user has access to project
    await this.checkProjectAccess(board.projectId, userId);

    return board;
  }

  async updateBoard(boardId: number, updateBoardDto: UpdateKanbanBoardDto, userId: number): Promise<KanbanBoard> {
    const board = await this.getBoardById(boardId, userId);

    // Check if user is project owner or admin
    const hasPermission = await this.checkProjectPermission(board.projectId, userId);
    if (!hasPermission) {
      throw new ForbiddenException('Only project owner or admin can update board');
    }

    Object.assign(board, updateBoardDto);
    return await this.kanbanBoardRepository.save(board);
  }

  // ========== SOFT DELETE METHODS ==========

  async softDeleteBoard(boardId: number, userId: number): Promise<{ message: string }> {
    const board = await this.getBoardById(boardId, userId);

    // Check if user is project owner or admin
    const hasPermission = await this.checkProjectPermission(board.projectId, userId);
    if (!hasPermission) {
      throw new ForbiddenException('Only project owner or admin can delete board');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Soft delete board
    board.isActive = false;
      await queryRunner.manager.save(board);

      // 2. Soft delete all columns in this board
      await queryRunner.manager.update(
        'kanban_columns',
        { boardId: boardId, isActive: true },
        { isActive: false }
      );

      // 3. Soft delete all tasks in this board
      await queryRunner.manager.update(
        'tasks',
        { boardId: boardId, deletedAt: null },
        { deletedAt: new Date() }
      );

      await queryRunner.commitTransaction();
      return { message: 'Board and all related data soft deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async softDeleteColumn(columnId: number, userId: number): Promise<{ message: string }> {
    const column = await this.getColumnById(columnId, userId);
    const board = await this.getBoardById(column.boardId, userId);

    // Check if user can delete columns
    const canDelete = await this.checkColumnPermission(board, 'delete');
    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete columns');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Soft delete all tasks in this column
      await queryRunner.manager.update(
        'tasks',
        { columnId: columnId, deletedAt: null },
        { deletedAt: new Date() }
      );

      // 2. Soft delete the column
      column.isActive = false;
      await queryRunner.manager.save(column);

      await queryRunner.commitTransaction();
      return { message: 'Column and all related tasks soft deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== HARD DELETE METHODS ==========

  async hardDeleteBoard(boardId: number, userId: number): Promise<{ message: string }> {
    const board = await this.getBoardById(boardId, userId);

    // Check if user is project owner or admin
    const hasPermission = await this.checkProjectPermission(board.projectId, userId);
    if (!hasPermission) {
      throw new ForbiddenException('Only project owner or admin can delete board');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Hard delete all tasks in this board
      await queryRunner.manager.delete(
        'tasks',
        { boardId: boardId }
      );

      // 2. Hard delete all columns in this board
      await queryRunner.manager.delete(
        'kanban_columns',
        { boardId: boardId }
      );

      // 3. Hard delete the board itself
      await queryRunner.manager.delete(
        'kanban_boards',
        { id: boardId }
      );

      await queryRunner.commitTransaction();
      return { message: 'Board and all related data hard deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async hardDeleteColumn(columnId: number, userId: number): Promise<{ message: string }> {
    const column = await this.getColumnById(columnId, userId);
    const board = await this.getBoardById(column.boardId, userId);

    // Check if user can delete columns
    const canDelete = await this.checkColumnPermission(board, 'delete');
    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete columns');
    }

    // Use transaction to ensure data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Hard delete all tasks in this column
      await queryRunner.manager.delete(
        'tasks',
        { columnId: columnId }
      );

      // 2. Hard delete the column
      await queryRunner.manager.delete(
        'kanban_columns',
        { id: columnId }
      );

      await queryRunner.commitTransaction();
      return { message: 'Column and all related tasks hard deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== LEGACY METHODS (for backward compatibility) ==========

  async deleteBoard(boardId: number, userId: number): Promise<{ message: string }> {
    // Default to soft delete for backward compatibility
    return this.softDeleteBoard(boardId, userId);
  }

  async deleteColumn(columnId: number, userId: number): Promise<{ message: string }> {
    // Default to hard delete for backward compatibility
    return this.hardDeleteColumn(columnId, userId);
  }

  // ========== KANBAN COLUMN METHODS ==========

  async createColumn(boardId: number, createColumnDto: CreateKanbanColumnDto, userId: number): Promise<KanbanColumn> {
    const board = await this.getBoardById(boardId, userId);

    // Check if user can create columns
    const canCreate = await this.checkColumnPermission(board, 'create');
    if (!canCreate) {
      throw new ForbiddenException('You do not have permission to create columns');
    }

    // Check if column name already exists in this board
    const existingColumn = await this.kanbanColumnRepository.findOne({
      where: { boardId, name: createColumnDto.name },
    });

    if (existingColumn) {
      throw new ConflictException('Column name already exists in this board');
    }

    // Get next order position
    const maxOrder = await this.kanbanColumnRepository
      .createQueryBuilder('column')
      .select('MAX(column.order)', 'maxOrder')
      .where('column.boardId = :boardId', { boardId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder || -1) + 1;

    // Create column
    const column = this.kanbanColumnRepository.create({
      ...createColumnDto,
      boardId,
      order: createColumnDto.order ?? nextOrder,
      type: createColumnDto.type ?? ColumnType.CUSTOM,
      color: createColumnDto.color ?? ColumnColor.BLUE,
      isActive: true,
    });

    return await this.kanbanColumnRepository.save(column);
  }

  async getBoardColumns(boardId: number, userId: number): Promise<{ columns: KanbanColumn[] }> {
    await this.getBoardById(boardId, userId);

    const columns = await this.kanbanColumnRepository.find({
      where: { boardId, isActive: true },
      order: { order: 'ASC' },
    });

    return { columns };
  }

  async getColumnById(columnId: number, userId: number): Promise<KanbanColumn> {
    const column = await this.kanbanColumnRepository.findOne({
      where: { id: columnId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Check if user has access to board
    await this.getBoardById(column.boardId, userId);

    return column;
  }

  async updateColumn(columnId: number, updateColumnDto: UpdateKanbanColumnDto, userId: number): Promise<KanbanColumn> {
    const column = await this.getColumnById(columnId, userId);
    const board = await this.getBoardById(column.boardId, userId);

    // Check if user can update columns
    const canUpdate = await this.checkColumnPermission(board, 'update');
    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update columns');
    }

    // Check if new name conflicts with existing columns
    if (updateColumnDto.name && updateColumnDto.name !== column.name) {
      const existingColumn = await this.kanbanColumnRepository.findOne({
        where: { boardId: column.boardId, name: updateColumnDto.name },
      });

      if (existingColumn) {
        throw new ConflictException('Column name already exists in this board');
      }
    }

    Object.assign(column, updateColumnDto);
    return await this.kanbanColumnRepository.save(column);
  }


  async reorderColumns(boardId: number, reorderDto: ReorderColumnsDto, userId: number): Promise<{ message: string }> {
    const board = await this.getBoardById(boardId, userId);

    // Check if user can reorder columns
    const canReorder = await this.checkColumnPermission(board, 'reorder');
    if (!canReorder) {
      throw new ForbiddenException('You do not have permission to reorder columns');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update order for each column
      for (let i = 0; i < reorderDto.columnIds.length; i++) {
        await queryRunner.manager.update(
          KanbanColumn,
          { id: reorderDto.columnIds[i], boardId },
          { order: i }
        );
      }

      await queryRunner.commitTransaction();
      return { message: 'Columns reordered successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

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

  private async checkProjectPermission(projectId: number, userId: number): Promise<boolean> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      return false;
    }

    // Owner has all permissions
    if (project.ownerId === userId) {
      return true;
    }

    // Check if user is admin
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId, isActive: true },
    });

    return member?.role === ProjectRole.ADMIN;
  }

  private async checkColumnPermission(board: KanbanBoard, action: 'create' | 'update' | 'delete' | 'reorder'): Promise<boolean> {
    // If board settings don't exist, allow by default
    if (!board.settings) {
      return true;
    }

    switch (action) {
      case 'create':
        return board.settings.allowColumnCreation !== false;
      case 'update':
        return true; // Always allow updates
      case 'delete':
        return board.settings.allowColumnDeletion !== false;
      case 'reorder':
        return board.settings.allowColumnReordering !== false;
      default:
        return false;
    }
  }

  private async createDefaultColumns(queryRunner: any, boardId: number, defaultColumns: string[]): Promise<void> {
    for (let i = 0; i < defaultColumns.length; i++) {
      const column = this.kanbanColumnRepository.create({
        boardId,
        name: defaultColumns[i],
        type: ColumnType.SYSTEM,
        color: ColumnColor.BLUE,
        order: i,
        isActive: true,
      });

      await queryRunner.manager.save(column);
    }
  }
}
