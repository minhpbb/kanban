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
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    const result = await this.projectsService.findAllProjects(req.user.userId, page, limit);
    return {
      ...result,
      page,
      limit,
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
}
