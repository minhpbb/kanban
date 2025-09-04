import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsInt, Min, IsEnum } from 'class-validator';
import { ColumnType, ColumnColor } from '../../entities/kanban-column.entity';

export class CreateKanbanColumnDto {
  @ApiProperty({ description: 'Column name', example: 'To Do' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Column description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: ColumnType,
    description: 'Column type',
    example: ColumnType.CUSTOM
  })
  @IsOptional()
  @IsEnum(ColumnType)
  type?: ColumnType;

  @ApiPropertyOptional({ 
    enum: ColumnColor,
    description: 'Column color',
    example: ColumnColor.BLUE
  })
  @IsOptional()
  @IsEnum(ColumnColor)
  color?: ColumnColor;

  @ApiPropertyOptional({ 
    description: 'Column order position',
    example: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum number of tasks (0 = unlimited)',
    example: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTasks?: number;

  @ApiPropertyOptional({ 
    description: 'Work in progress limit enabled',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isWipLimit?: boolean;

  @ApiPropertyOptional({ 
    description: 'WIP settings',
    example: {
      limit: 5,
      warningThreshold: 4,
      color: '#ff9800'
    }
  })
  @IsOptional()
  @IsObject()
  wipSettings?: {
    limit?: number;
    warningThreshold?: number;
    color?: string;
  };

  @ApiPropertyOptional({ 
    description: 'Column rules',
    example: {
      allowTaskCreation: true,
      allowTaskMovement: true,
      requiredFields: ['title'],
      autoAssign: false
    }
  })
  @IsOptional()
  @IsObject()
  rules?: {
    allowTaskCreation?: boolean;
    allowTaskMovement?: boolean;
    requiredFields?: string[];
    autoAssign?: boolean;
    defaultAssignee?: string;
  };
}

export class UpdateKanbanColumnDto {
  @ApiPropertyOptional({ description: 'Column name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Column description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    enum: ColumnType,
    description: 'Column type'
  })
  @IsOptional()
  @IsEnum(ColumnType)
  type?: ColumnType;

  @ApiPropertyOptional({ 
    enum: ColumnColor,
    description: 'Column color'
  })
  @IsOptional()
  @IsEnum(ColumnColor)
  color?: ColumnColor;

  @ApiPropertyOptional({ 
    description: 'Column order position'
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum number of tasks (0 = unlimited)'
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTasks?: number;

  @ApiPropertyOptional({ 
    description: 'Column active status'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Work in progress limit enabled'
  })
  @IsOptional()
  @IsBoolean()
  isWipLimit?: boolean;

  @ApiPropertyOptional({ 
    description: 'WIP settings'
  })
  @IsOptional()
  @IsObject()
  wipSettings?: {
    limit?: number;
    warningThreshold?: number;
    color?: string;
  };

  @ApiPropertyOptional({ 
    description: 'Column rules'
  })
  @IsOptional()
  @IsObject()
  rules?: {
    allowTaskCreation?: boolean;
    allowTaskMovement?: boolean;
    requiredFields?: string[];
    autoAssign?: boolean;
    defaultAssignee?: string;
  };
}

export class KanbanColumnResponseDto {
  @ApiProperty({ description: 'Column ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Column name', example: 'To Do' })
  name: string;

  @ApiPropertyOptional({ description: 'Column description' })
  description?: string;

  @ApiProperty({ description: 'Board ID', example: 1 })
  boardId: number;

  @ApiProperty({ 
    enum: ColumnType,
    description: 'Column type'
  })
  type: ColumnType;

  @ApiProperty({ 
    enum: ColumnColor,
    description: 'Column color'
  })
  color: ColumnColor;

  @ApiProperty({ description: 'Column order position' })
  order: number;

  @ApiProperty({ description: 'Maximum number of tasks' })
  maxTasks: number;

  @ApiProperty({ description: 'Column active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Work in progress limit enabled' })
  isWipLimit: boolean;

  @ApiPropertyOptional({ description: 'WIP settings' })
  wipSettings?: {
    limit?: number;
    warningThreshold?: number;
    color?: string;
  };

  @ApiPropertyOptional({ description: 'Column rules' })
  rules?: {
    allowTaskCreation?: boolean;
    allowTaskMovement?: boolean;
    requiredFields?: string[];
    autoAssign?: boolean;
    defaultAssignee?: string;
  };

  @ApiProperty({ description: 'Column creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Column last update date' })
  updatedAt: Date;
}

export class ReorderColumnsDto {
  @ApiProperty({ 
    description: 'Array of column IDs in new order',
    example: [3, 1, 2]
  })
  @IsInt({ each: true })
  columnIds: number[];
}
