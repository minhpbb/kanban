import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  avatar: string; // Project avatar image path

  @Column({ 
    type: 'enum', 
    enum: ProjectStatus, 
    default: ProjectStatus.ACTIVE 
  })
  status: ProjectStatus;

  @Column({ type: 'int' })
  ownerId: number; // User who created the project (only ID, no relation)

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'json', nullable: true })
  settings: {
    allowGuestAccess?: boolean;
    defaultTaskStatuses?: string[];
    taskLabels?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
