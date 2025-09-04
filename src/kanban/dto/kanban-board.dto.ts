import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateKanbanBoardDto {
  @ApiProperty({ description: 'Board name', example: 'Sprint 1 Board' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Board description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Board settings',
    example: {
      allowColumnCreation: true,
      allowColumnDeletion: true,
      allowColumnReordering: true,
      defaultColumns: ['To Do', 'In Progress', 'Done'],
      maxColumns: 10
    }
  })
  @IsOptional()
  @IsObject()
  settings?: {
    allowColumnCreation?: boolean;
    allowColumnDeletion?: boolean;
    allowColumnReordering?: boolean;
    defaultColumns?: string[];
    maxColumns?: number;
  };
}

export class UpdateKanbanBoardDto {
  @ApiPropertyOptional({ description: 'Board name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Board description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Board settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    allowColumnCreation?: boolean;
    allowColumnDeletion?: boolean;
    allowColumnReordering?: boolean;
    defaultColumns?: string[];
    maxColumns?: number;
  };

  @ApiPropertyOptional({ description: 'Board active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class KanbanBoardResponseDto {
  @ApiProperty({ description: 'Board ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Board name', example: 'Sprint 1 Board' })
  name: string;

  @ApiPropertyOptional({ description: 'Board description' })
  description?: string;

  @ApiProperty({ description: 'Project ID', example: 1 })
  projectId: number;

  @ApiProperty({ description: 'Created by user ID', example: 1 })
  createdById: number;

  @ApiPropertyOptional({ description: 'Board settings' })
  settings?: {
    allowColumnCreation?: boolean;
    allowColumnDeletion?: boolean;
    allowColumnReordering?: boolean;
    defaultColumns?: string[];
    maxColumns?: number;
  };

  @ApiProperty({ description: 'Board active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Board creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Board last update date' })
  updatedAt: Date;
}
