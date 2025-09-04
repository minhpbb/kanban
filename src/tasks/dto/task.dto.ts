import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsInt, Min, IsEnum, IsDateString, IsArray } from 'class-validator';
import { TaskPriority } from '../../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Fix login bug' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project ID', example: 1 })
  @IsInt()
  @Min(1)
  projectId: number;

  @ApiProperty({ description: 'Board ID', example: 1 })
  @IsInt()
  @Min(1)
  boardId: number;

  @ApiProperty({ description: 'Column ID', example: 1 })
  @IsInt()
  @Min(1)
  columnId: number;

  @ApiPropertyOptional({ 
    enum: TaskPriority,
    description: 'Task priority',
    example: TaskPriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Assignee user ID', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ 
    description: 'Task due date',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ 
    description: 'Task labels',
    example: ['bug', 'urgent', 'frontend']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({ 
    description: 'Task attachments',
    example: [
      {
        filename: 'screenshot.png',
        url: 'uploads/tasks/task-1_screenshot.png',
        size: 1024000,
        type: 'image/png'
      }
    ]
  })
  @IsOptional()
  @IsArray()
  attachments?: {
    filename: string;
    url: string;
    size: number;
    type: string;
  }[];

  @ApiPropertyOptional({ 
    description: 'Custom fields',
    example: {
      storyPoints: 5,
      epic: 'User Management',
      component: 'Authentication'
    }
  })
  @IsOptional()
  @IsObject()
  customFields?: {
    [key: string]: any;
  };

  @ApiPropertyOptional({ 
    description: 'Time tracking settings',
    example: {
      estimatedHours: 8,
      actualHours: 0
    }
  })
  @IsOptional()
  @IsObject()
  timeTracking?: {
    estimatedHours?: number;
    actualHours?: number;
    startedAt?: Date;
    completedAt?: Date;
  };
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Column ID (for drag & drop)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  columnId?: number;

  @ApiPropertyOptional({ 
    enum: TaskPriority,
    description: 'Task priority'
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ 
    description: 'Task due date',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Task labels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({ description: 'Task attachments' })
  @IsOptional()
  @IsArray()
  attachments?: {
    filename: string;
    url: string;
    size: number;
    type: string;
  }[];

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: {
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Time tracking settings' })
  @IsOptional()
  @IsObject()
  timeTracking?: {
    estimatedHours?: number;
    actualHours?: number;
    startedAt?: Date;
    completedAt?: Date;
  };
}

export class TaskResponseDto {
  @ApiProperty({ description: 'Task ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Task title', example: 'Fix login bug' })
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  description?: string;

  @ApiProperty({ description: 'Project ID', example: 1 })
  projectId: number;

  @ApiProperty({ description: 'Board ID', example: 1 })
  boardId: number;

  @ApiProperty({ description: 'Column ID', example: 1 })
  columnId: number;

  @ApiProperty({ 
    enum: TaskPriority,
    description: 'Task priority'
  })
  priority: TaskPriority;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  assigneeId?: number;

  @ApiProperty({ description: 'Created by user ID', example: 1 })
  createdById: number;

  @ApiProperty({ description: 'Task order in column' })
  order: number;

  @ApiPropertyOptional({ description: 'Task due date' })
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Task labels' })
  labels?: string[];

  @ApiPropertyOptional({ description: 'Task attachments' })
  attachments?: {
    filename: string;
    url: string;
    size: number;
    type: string;
  }[];

  @ApiPropertyOptional({ description: 'Task comments' })
  comments?: {
    id: number;
    userId: number;
    content: string;
    createdAt: Date;
  }[];

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: {
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Time tracking settings' })
  timeTracking?: {
    estimatedHours?: number;
    actualHours?: number;
    startedAt?: Date;
    completedAt?: Date;
  };

  @ApiProperty({ description: 'Task creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Task last update date' })
  updatedAt: Date;
}

export class MoveTaskDto {
  @ApiProperty({ description: 'Target column ID', example: 2 })
  @IsInt()
  @Min(1)
  targetColumnId: number;

  @ApiPropertyOptional({ description: 'New order position in target column', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  newOrder?: number;
}

export class ReorderTasksDto {
  @ApiProperty({ 
    description: 'Array of task IDs in new order',
    example: [3, 1, 2]
  })
  @IsInt({ each: true })
  taskIds: number[];
}

export class AddCommentDto {
  @ApiProperty({ description: 'Comment content', example: 'This task is ready for review' })
  @IsString()
  content: string;
}

export class CommentResponseDto {
  @ApiProperty({ description: 'Comment ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'User ID who made the comment', example: 1 })
  userId: number;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Comment creation date' })
  createdAt: Date;
}
