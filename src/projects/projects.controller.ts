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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto, ProjectListResponseDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';
import { ProjectRole } from '../entities/project-member.entity';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('project:create')
  @ApiOperation({ 
    summary: 'Create a new project', 
    description: 'Create a new project with the current user as owner' 
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Project created successfully',
    type: ProjectResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req,
  ) {
    return this.projectsService.createProject(createProjectDto, req.user.userId);
  }

  @Get()
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get all projects', 
    description: 'Get all projects where the user is owner or member' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Projects retrieved successfully',
    type: ProjectListResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async findAllProjects(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const result = await this.projectsService.findAllProjects(req.user.userId, pageNum, limitNum);
    return {
      ...result,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get(':id')
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get project by ID', 
    description: 'Get a specific project by ID (user must be owner or member)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project retrieved successfully',
    type: ProjectResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async findProjectById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.projectsService.findProjectById(id, req.user.userId);
  }

  @Patch(':id')
  @RequirePermissions('project:update')
  @ApiOperation({ 
    summary: 'Update project', 
    description: 'Update project information (only owner or admin can update)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Project updated successfully',
    type: ProjectResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to update' })
  @ApiBadRequestResponse({ description: 'Project not found or validation error' })
  async updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    return this.projectsService.updateProject(id, updateProjectDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermissions('project:delete')
  @ApiOperation({ 
    summary: 'Delete project', 
    description: 'Delete project (only owner can delete)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project deleted successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Project deleted successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to delete' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async deleteProject(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.projectsService.deleteProject(id, req.user.userId);
  }

  @Post(':id/members')
  @RequirePermissions('project:update')
  @ApiOperation({ 
    summary: 'Add project member', 
    description: 'Add a new member to the project (only owner or admin can add members)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'User ID to add as member' },
        role: { type: 'string', enum: Object.values(ProjectRole), description: 'Member role' }
      },
      required: ['userId', 'role']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Member added successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Member added successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to add members' })
  @ApiBadRequestResponse({ description: 'User not found or already a member' })
  async addProjectMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() body: { userId: number; role: ProjectRole },
    @Request() req,
  ) {
    return this.projectsService.addProjectMember(projectId, body.userId, body.role, req.user.userId);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('project:update')
  @ApiOperation({ 
    summary: 'Remove project member', 
    description: 'Remove a member from the project (only owner or admin can remove members)' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID to remove' })
  @ApiResponse({ 
    status: 200, 
    description: 'Member removed successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Member removed successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or not authorized to remove members' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async removeProjectMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) memberUserId: number,
    @Request() req,
  ) {
    return this.projectsService.removeProjectMember(projectId, memberUserId, req.user.userId);
  }

  @Get(':id/members')
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get project members', 
    description: 'Get all members of the project' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project members retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          members: [
            {
              id: 1,
              userId: 1,
              role: 'admin',
              isActive: true,
              joinedAt: '2024-01-01T00:00:00.000Z',
              username: 'admin',
              email: 'admin@example.com',
              fullName: 'Administrator',
              avatar: 'uploads/avatars/users/user-1_abc123.jpg'
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
  async getProjectMembers(
    @Param('id', ParseIntPipe) projectId: number,
    @Request() req,
  ) {
    return this.projectsService.getProjectMembers(projectId, req.user.userId);
  }

  @Get(':id/overview')
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get project overview', 
    description: 'Get project overview with statistics, recent activities, and progress' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project overview retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          project: {
            id: 1,
            name: 'My Kanban Project',
            description: 'Project description',
            status: 'active',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-12-31T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          statistics: {
            totalTasks: 25,
            completedTasks: 15,
            inProgressTasks: 7,
            overdueTasks: 3,
            totalMembers: 5,
            completionPercentage: 60
          },
          recentActivities: [
            {
              id: 1,
              type: 'task_created',
              description: 'Task "Fix login bug" was created',
              userId: 1,
              userName: 'John Doe',
              createdAt: '2024-01-15T10:30:00.000Z'
            }
          ],
          taskDistribution: {
            byStatus: {
              'To Do': 5,
              'In Progress': 7,
              'Done': 15
            },
            byPriority: {
              'low': 8,
              'medium': 12,
              'high': 4,
              'urgent': 1
            }
          }
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async getProjectOverview(
    @Param('id', ParseIntPipe) projectId: number,
    @Request() req,
  ) {
    return this.projectsService.getProjectOverview(projectId, req.user.userId);
  }

  @Get(':id/statistics')
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get project statistics', 
    description: 'Get detailed project statistics and metrics' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'Time period: week, month, quarter, year' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project statistics retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          totalTasks: 25,
          completedTasks: 15,
          inProgressTasks: 7,
          overdueTasks: 3,
          totalMembers: 5,
          completionPercentage: 60,
          averageTaskCompletionTime: 3.5,
          tasksCreatedThisWeek: 8,
          tasksCompletedThisWeek: 5,
          topContributors: [
            {
              userId: 1,
              userName: 'John Doe',
              tasksCompleted: 8,
              avatar: 'uploads/avatars/users/user-1_abc123.jpg'
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
  async getProjectStatistics(
    @Param('id', ParseIntPipe) projectId: number,
    @Request() req,
    @Query('period') period?: string,
  ) {
    return this.projectsService.getProjectStatistics(projectId, req.user.userId, period);
  }

  @Get(':id/activities')
  @RequirePermissions('project:read')
  @ApiOperation({ 
    summary: 'Get project activities', 
    description: 'Get recent project activities and updates' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to return (default: 20)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by activity type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project activities retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          activities: [
            {
              id: 1,
              type: 'task_created',
              description: 'Task "Fix login bug" was created',
              userId: 1,
              userName: 'John Doe',
              userAvatar: 'uploads/avatars/users/user-1_abc123.jpg',
              taskId: 1,
              taskTitle: 'Fix login bug',
              createdAt: '2024-01-15T10:30:00.000Z'
            }
          ],
          total: 50
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or no access to project' })
  @ApiBadRequestResponse({ description: 'Project not found' })
  async getProjectActivities(
    @Param('id', ParseIntPipe) projectId: number,
    @Request() req,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.projectsService.getProjectActivities(projectId, req.user.userId, limitNum, type);
  }
}
