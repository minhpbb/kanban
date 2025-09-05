import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ActivityType {
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_MOVED = 'task_moved',
  TASK_COMMENTED = 'task_commented',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  MEMBER_ROLE_CHANGED = 'member_role_changed',
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  BOARD_CREATED = 'board_created',
  BOARD_UPDATED = 'board_updated',
  BOARD_DELETED = 'board_deleted',
  COLUMN_CREATED = 'column_created',
  COLUMN_UPDATED = 'column_updated',
  COLUMN_DELETED = 'column_deleted',
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted',
}

@Entity('activity_logs')
@Index(['projectId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  projectId: number; // Project ID only, no relation

  @Column({ type: 'int' })
  @Index()
  userId: number; // User ID only, no relation

  @Column({ 
    type: 'enum', 
    enum: ActivityType 
  })
  action: ActivityType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    taskId?: number;
    boardId?: number;
    columnId?: number;
    memberId?: number;
    fileName?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityType: string; // 'task', 'project', 'member', 'board', 'column'

  @Column({ type: 'int', nullable: true })
  entityId: number; // ID of the affected entity

  @Column({ type: 'boolean', default: true })
  isVisible: boolean; // For filtering sensitive activities

  @CreateDateColumn()
  createdAt: Date;
}
