import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('task_templates')
export class TaskTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  projectId: number;

  @Column({ type: 'int' })
  @Index()
  createdById: number; // User who created this template

  @Column({ length: 255 })
  name: string; // Template name for easy identification

  @Column({ length: 255 })
  title: string; // Default task title

  @Column({ type: 'text', nullable: true })
  description: string; // Default task description

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'int', nullable: true })
  defaultColumnId: number; // Default kanban column

  @Column({ type: 'json', nullable: true })
  defaultLabels: string[]; // Default labels

  @Column({ type: 'json', nullable: true })
  defaultAssignees: string[]; // Default assignee IDs

  @Column({ type: 'int', default: 0 })
  estimatedHours: number; // Default estimated time

  @Column({ type: 'json', nullable: true })
  defaultCustomFields: object; // Default custom fields

  @Column({ type: 'text', nullable: true })
  notes: string; // Template notes/instructions

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number; // How many times this template was used

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
