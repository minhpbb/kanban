import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ProjectStatus } from '../../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'My Kanban Project' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'A project management system' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project avatar image path' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ 
    description: 'Project start date', 
    example: '2024-01-01',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'Project end date', 
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'Project settings',
    example: {
      allowGuestAccess: false,
      defaultTaskStatuses: ['To Do', 'In Progress', 'Done'],
      taskLabels: ['Bug', 'Feature', 'Enhancement']
    }
  })
  @IsOptional()
  @IsObject()
  settings?: {
    allowGuestAccess?: boolean;
    defaultTaskStatuses?: string[];
    taskLabels?: string[];
  };
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'Updated Project Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project avatar image path' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ 
    enum: ProjectStatus,
    description: 'Project status'
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ 
    description: 'Project start date',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'Project end date',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    allowGuestAccess?: boolean;
    defaultTaskStatuses?: string[];
    taskLabels?: string[];
  };
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Project name', example: 'My Kanban Project' })
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Project avatar image path' })
  avatar?: string;

  @ApiProperty({ 
    enum: ProjectStatus,
    description: 'Project status'
  })
  status: ProjectStatus;

  @ApiProperty({ description: 'Project owner ID', example: 1 })
  ownerId: number;

  @ApiPropertyOptional({ description: 'Project start date' })
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Project end date' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Project settings' })
  settings?: {
    allowGuestAccess?: boolean;
    defaultTaskStatuses?: string[];
    taskLabels?: string[];
  };

  @ApiProperty({ description: 'Project creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Project last update date' })
  updatedAt: Date;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto], description: 'List of projects' })
  projects: ProjectResponseDto[];

  @ApiProperty({ description: 'Total number of projects', example: 10 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;
}
