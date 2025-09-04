import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ColumnType {
  CUSTOM = 'custom',
  SYSTEM = 'system',
}

@Entity('kanban_boards')
export class KanbanBoard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  projectId: number; // Project ID only, no relation

  @Column({ type: 'int' })
  @Index()
  createdById: number; // User ID only, no relation

  @Column({ type: 'json', nullable: true })
  settings: {
    allowColumnCreation?: boolean;
    allowColumnDeletion?: boolean;
    allowColumnReordering?: boolean;
    defaultColumns?: string[];
    maxColumns?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
