import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  PROJECT_INVITE = 'project_invite',
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  TASK_MOVED = 'task_moved',
  TASK_COMMENTED = 'task_commented',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_FILE_UPLOADED = 'task_file_uploaded',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  userId: number; // User who receives the notification

  @Column({ type: 'int', nullable: true })
  @Index()
  projectId: number; // Related project (optional)

  @Column({ type: 'int', nullable: true })
  @Index()
  taskId: number; // Related task (optional)

  @Column({ type: 'int', nullable: true })
  @Index()
  fromUserId: number; // User who triggered the notification

  @Column({ 
    type: 'enum', 
    enum: NotificationType 
  })
  type: NotificationType;

  @Column({ 
    type: 'enum', 
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD
  })
  status: NotificationStatus;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    projectName?: string;
    taskTitle?: string;
    fromUserName?: string;
    fromUserAvatar?: string;
    columnName?: string;
    oldColumnName?: string;
    role?: string;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
