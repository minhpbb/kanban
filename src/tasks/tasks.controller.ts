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
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto, MoveTaskDto, ReorderTasksDto, AddCommentDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ========== TASK CRUD ENDPOINTS ==========

  @Post()
  @RequirePermissions('task:create')
  @ApiOperation({ 
    summary: 'Create a new task', 
    description: 'Create a new task in a kanban board column' 
  })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Task created successfully',
    type: TaskResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project/Board/Column not found or validation error' })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.createTask(createTaskDto, req.user.userId);
  }

  @Get('project/:projectId')
  @RequirePermissions('task:read')
  @ApiOperation({ 
    summary: 'Get project tasks', 
    description: 'Get all tasks for a project, optionally filtered by board' 
  })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiQuery({ name: 'boardId', required: false, type: Number, description: 'Filter by board ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tasks retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          tasks: [
            {
              id: 1,
              title: 'Fix login bug',
              description: 'User cannot login with valid credentials',
              projectId: 1,
              boardId: 1,
              columnId: 2,
              priority: 'high',
              assigneeId: 2,
              createdById: 1,
              order: 0,
              dueDate: '2024-01-15T00:00:00.000Z',
              labels: ['bug', 'urgent'],
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
  async getProjectTasks(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('boardId', new ParseIntPipe({ optional: true })) boardId: number,
    @Request() req,
  ) {
    return this.tasksService.getProjectTasks(projectId, req.user.userId, boardId);
  }

  @Get('column/:columnId')
  @RequirePermissions('task:read')
  @ApiOperation({ 
    summary: 'Get column tasks', 
    description: 'Get all tasks in a specific column' 
  })
  @ApiParam({ name: 'columnId', type: Number, description: 'Column ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tasks retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          tasks: [
            {
              id: 1,
              title: 'Fix login bug',
              columnId: 1,
              order: 0,
              priority: 'high'
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to column' })
  @ApiBadRequestResponse({ description: 'Column not found' })
  async getColumnTasks(
    @Param('columnId', ParseIntPipe) columnId: number,
    @Request() req,
  ) {
    return this.tasksService.getColumnTasks(columnId, req.user.userId);
  }

  @Get(':id')
  @RequirePermissions('task:read')
  @ApiOperation({ 
    summary: 'Get task by ID', 
    description: 'Get a specific task by ID' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Task retrieved successfully',
    type: TaskResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to task' })
  @ApiBadRequestResponse({ description: 'Task not found' })
  async getTaskById(
    @Param('id', ParseIntPipe) taskId: number,
    @Request() req,
  ) {
    return this.tasksService.getTaskById(taskId, req.user.userId);
  }

  @Patch(':id')
  @RequirePermissions('task:update')
  @ApiOperation({ 
    summary: 'Update task', 
    description: 'Update task information' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Task updated successfully',
    type: TaskResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to update task' })
  @ApiBadRequestResponse({ description: 'Task not found or validation error' })
  async updateTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.updateTask(taskId, updateTaskDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermissions('task:delete')
  @ApiOperation({ 
    summary: 'Delete task', 
    description: 'Delete a task' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Task deleted successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Task deleted successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to delete task' })
  @ApiBadRequestResponse({ description: 'Task not found' })
  async deleteTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Request() req,
  ) {
    return this.tasksService.deleteTask(taskId, req.user.userId);
  }

  // ========== DRAG & DROP ENDPOINTS ==========

  @Patch(':id/move')
  @RequirePermissions('task:update')
  @ApiOperation({ 
    summary: 'Move task to different column', 
    description: 'Move task to a different column (drag & drop functionality)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiBody({ type: MoveTaskDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Task moved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Task moved successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to move task' })
  @ApiBadRequestResponse({ description: 'Task not found or target column not found' })
  async moveTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() moveTaskDto: MoveTaskDto,
    @Request() req,
  ) {
    return this.tasksService.moveTask(taskId, moveTaskDto, req.user.userId);
  }

  @Patch('column/:columnId/reorder')
  @RequirePermissions('task:update')
  @ApiOperation({ 
    summary: 'Reorder tasks in column', 
    description: 'Reorder tasks within a column (drag & drop reordering)' 
  })
  @ApiParam({ name: 'columnId', type: Number, description: 'Column ID' })
  @ApiBody({ type: ReorderTasksDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Tasks reordered successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Tasks reordered successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to column' })
  @ApiBadRequestResponse({ description: 'Column not found or validation error' })
  async reorderTasksInColumn(
    @Param('columnId', ParseIntPipe) columnId: number,
    @Body() reorderDto: ReorderTasksDto,
    @Request() req,
  ) {
    return this.tasksService.reorderTasksInColumn(columnId, reorderDto, req.user.userId);
  }

  // ========== COMMENT ENDPOINTS ==========

  @Post(':id/comments')
  @RequirePermissions('task:update')
  @ApiOperation({ 
    summary: 'Add comment to task', 
    description: 'Add a comment to a task' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiBody({ type: AddCommentDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Comment added successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Comment added successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to comment on task' })
  @ApiBadRequestResponse({ description: 'Task not found or validation error' })
  async addComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() addCommentDto: AddCommentDto,
    @Request() req,
  ) {
    return this.tasksService.addComment(taskId, addCommentDto, req.user.userId);
  }

  @Get(':id/comments')
  @RequirePermissions('task:read')
  @ApiOperation({ 
    summary: 'Get task comments', 
    description: 'Get all comments for a task' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Task ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Comments retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          comments: [
            {
              id: 1640995200000,
              userId: 1,
              content: 'This task is ready for review',
              createdAt: '2024-01-01T00:00:00.000Z'
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to task' })
  @ApiBadRequestResponse({ description: 'Task not found' })
  async getTaskComments(
    @Param('id', ParseIntPipe) taskId: number,
    @Request() req,
  ) {
    return this.tasksService.getTaskComments(taskId, req.user.userId);
  }
}
