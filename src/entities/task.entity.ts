import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  @Index()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  @Index()
  projectId: number; // Project ID only, no relation

  @Column({ type: 'int' })
  boardId: number; // Board ID only, no relation

  @Column({ type: 'int' })
  columnId: number; // Column ID only, no relation - replaces fixed status

  @Column({ 
    type: 'enum', 
    enum: TaskPriority, 
    default: TaskPriority.MEDIUM 
  })
  priority: TaskPriority;

  @Column({ type: 'int', nullable: true })
  @Index()
  assigneeId: number; // User ID only, no relation

  @Column({ type: 'int' })
  @Index()
  createdById: number; // User ID only, no relation

  @Column({ type: 'int', default: 0 })
  order: number; // For drag & drop ordering within column

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'json', nullable: true })
  labels: string[];

  @Column({ type: 'json', nullable: true })
  attachments: {
    filename: string;
    url: string;
    size: number;
    type: string;
  }[];

  @Column({ type: 'json', nullable: true })
  comments: {
    id: number;
    userId: number; // User ID only, no relation
    content: string;
    createdAt: Date;
  }[];

  @Column({ type: 'json', nullable: true })
  customFields: {
    [key: string]: any; // Flexible custom fields
  };

  @Column({ type: 'json', nullable: true })
  timeTracking: {
    estimatedHours?: number;
    actualHours?: number;
    startedAt?: Date;
    completedAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
