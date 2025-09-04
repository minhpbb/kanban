import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { ColumnType } from './kanban-board.entity';

export { ColumnType };

export enum ColumnColor {
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
  PURPLE = 'purple',
  ORANGE = 'orange',
  GRAY = 'gray',
  PINK = 'pink',
}

@Entity('kanban_columns')
@Unique(['boardId', 'name']) // Ensure unique column name within a board
export class KanbanColumn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  @Index()
  boardId: number; // Board ID only, no relation

  @Column({ 
    type: 'enum', 
    enum: ColumnType, 
    default: ColumnType.CUSTOM 
  })
  type: ColumnType;

  @Column({ 
    type: 'enum', 
    enum: ColumnColor, 
    default: ColumnColor.BLUE 
  })
  color: ColumnColor;

  @Column({ type: 'int', default: 0 })
  order: number; // For column ordering

  @Column({ type: 'int', default: 0 })
  maxTasks: number; // 0 means unlimited

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isWipLimit: boolean; // Work in progress limit

  @Column({ type: 'json', nullable: true })
  wipSettings: {
    limit?: number;
    warningThreshold?: number;
    color?: string;
  };

  @Column({ type: 'json', nullable: true })
  rules: {
    allowTaskCreation?: boolean;
    allowTaskMovement?: boolean;
    requiredFields?: string[];
    autoAssign?: boolean;
    defaultAssignee?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // For soft delete

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
