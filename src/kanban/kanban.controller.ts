import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiParam,
} from '@nestjs/swagger';
import { KanbanService } from './kanban.service';
import { CreateKanbanBoardDto, UpdateKanbanBoardDto, KanbanBoardResponseDto } from './dto/kanban-board.dto';
import { CreateKanbanColumnDto, UpdateKanbanColumnDto, KanbanColumnResponseDto, ReorderColumnsDto } from './dto/kanban-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';

@ApiTags('kanban')
@Controller('kanban')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  // ========== KANBAN BOARD ENDPOINTS ==========

  @Post('projects/:projectId/boards')
  @RequirePermissions('kanban:create')
  @ApiOperation({ 
    summary: 'Create kanban board', 
    description: 'Create a new kanban board for a project' 
  })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiBody({ type: CreateKanbanBoardDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Board created successfully',
    type: KanbanBoardResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project not found or validation error' })
  async createBoard(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createBoardDto: CreateKanbanBoardDto,
    @Request() req,
  ) {
    return this.kanbanService.createBoard(projectId, createBoardDto, req.user.userId);
  }

  @Get('projects/:projectId/boards')
  @RequirePermissions('kanban:read')
  @ApiOperation({ 
    summary: 'Get project boards', 
    description: 'Get all kanban boards for a project' 
  })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Boards retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          boards: [
            {
              id: 1,
              name: 'Sprint 1 Board',
              description: 'Main development board',
              projectId: 1,
              createdById: 1,
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async getProjectBoards(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req,
  ) {
    return this.kanbanService.getProjectBoards(projectId, req.user.userId);
  }

  @Get('boards/:id')
  @RequirePermissions('kanban:read')
  @ApiOperation({ 
    summary: 'Get board by ID', 
    description: 'Get a specific kanban board by ID' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Board ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Board retrieved successfully',
    type: KanbanBoardResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Board not found' })
  async getBoardById(
    @Param('id', ParseIntPipe) boardId: number,
    @Request() req,
  ) {
    return this.kanbanService.getBoardById(boardId, req.user.userId);
  }

  @Patch('boards/:id')
  @RequirePermissions('kanban:update')
  @ApiOperation({ 
    summary: 'Update board', 
    description: 'Update kanban board information (only project owner or admin)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Board ID' })
  @ApiBody({ type: UpdateKanbanBoardDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Board updated successfully',
    type: KanbanBoardResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to update' })
  @ApiBadRequestResponse({ description: 'Board not found or validation error' })
  async updateBoard(
    @Param('id', ParseIntPipe) boardId: number,
    @Body() updateBoardDto: UpdateKanbanBoardDto,
    @Request() req,
  ) {
    return this.kanbanService.updateBoard(boardId, updateBoardDto, req.user.userId);
  }

  @Delete('boards/:id')
  @RequirePermissions('kanban:delete')
  @ApiOperation({ 
    summary: 'Delete board', 
    description: 'Delete kanban board (only project owner or admin)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Board ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Board deleted successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Board deleted successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to delete' })
  @ApiBadRequestResponse({ description: 'Board not found' })
  async deleteBoard(
    @Param('id', ParseIntPipe) boardId: number,
    @Request() req,
  ) {
    return this.kanbanService.deleteBoard(boardId, req.user.userId);
  }

  // ========== KANBAN COLUMN ENDPOINTS ==========

  @Post('boards/:boardId/columns')
  @RequirePermissions('kanban:create')
  @ApiOperation({ 
    summary: 'Create kanban column', 
    description: 'Create a new column in a kanban board' 
  })
  @ApiParam({ name: 'boardId', type: Number, description: 'Board ID' })
  @ApiBody({ type: CreateKanbanColumnDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Column created successfully',
    type: KanbanColumnResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to create columns' })
  @ApiBadRequestResponse({ description: 'Board not found, column name exists, or validation error' })
  async createColumn(
    @Param('boardId', ParseIntPipe) boardId: number,
    @Body() createColumnDto: CreateKanbanColumnDto,
    @Request() req,
  ) {
    return this.kanbanService.createColumn(boardId, createColumnDto, req.user.userId);
  }

  @Get('boards/:boardId/columns')
  @RequirePermissions('kanban:read')
  @ApiOperation({ 
    summary: 'Get board columns', 
    description: 'Get all columns for a kanban board' 
  })
  @ApiParam({ name: 'boardId', type: Number, description: 'Board ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Columns retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          columns: [
            {
              id: 1,
              name: 'To Do',
              boardId: 1,
              type: 'system',
              color: 'blue',
              order: 0,
              maxTasks: 0,
              isActive: true,
              isWipLimit: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to board' })
  @ApiBadRequestResponse({ description: 'Board not found' })
  async getBoardColumns(
    @Param('boardId', ParseIntPipe) boardId: number,
    @Request() req,
  ) {
    return this.kanbanService.getBoardColumns(boardId, req.user.userId);
  }

  @Get('columns/:id')
  @RequirePermissions('kanban:read')
  @ApiOperation({ 
    summary: 'Get column by ID', 
    description: 'Get a specific kanban column by ID' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Column ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Column retrieved successfully',
    type: KanbanColumnResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to board' })
  @ApiBadRequestResponse({ description: 'Column not found' })
  async getColumnById(
    @Param('id', ParseIntPipe) columnId: number,
    @Request() req,
  ) {
    return this.kanbanService.getColumnById(columnId, req.user.userId);
  }

  @Patch('columns/:id')
  @RequirePermissions('kanban:update')
  @ApiOperation({ 
    summary: 'Update column', 
    description: 'Update kanban column information' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Column ID' })
  @ApiBody({ type: UpdateKanbanColumnDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Column updated successfully',
    type: KanbanColumnResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to update columns' })
  @ApiBadRequestResponse({ description: 'Column not found, name conflict, or validation error' })
  async updateColumn(
    @Param('id', ParseIntPipe) columnId: number,
    @Body() updateColumnDto: UpdateKanbanColumnDto,
    @Request() req,
  ) {
    return this.kanbanService.updateColumn(columnId, updateColumnDto, req.user.userId);
  }

  @Delete('columns/:id')
  @RequirePermissions('kanban:delete')
  @ApiOperation({ 
    summary: 'Delete column', 
    description: 'Delete kanban column' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Column ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Column deleted successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Column deleted successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to delete columns' })
  @ApiBadRequestResponse({ description: 'Column not found' })
  async deleteColumn(
    @Param('id', ParseIntPipe) columnId: number,
    @Request() req,
  ) {
    return this.kanbanService.deleteColumn(columnId, req.user.userId);
  }

  @Patch('boards/:boardId/columns/reorder')
  @RequirePermissions('kanban:update')
  @ApiOperation({ 
    summary: 'Reorder columns', 
    description: 'Reorder columns in a kanban board' 
  })
  @ApiParam({ name: 'boardId', type: Number, description: 'Board ID' })
  @ApiBody({ type: ReorderColumnsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Columns reordered successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Columns reordered successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to reorder columns' })
  @ApiBadRequestResponse({ description: 'Board not found or validation error' })
  async reorderColumns(
    @Param('boardId', ParseIntPipe) boardId: number,
    @Body() reorderDto: ReorderColumnsDto,
    @Request() req,
  ) {
    return this.kanbanService.reorderColumns(boardId, reorderDto, req.user.userId);
  }
}
