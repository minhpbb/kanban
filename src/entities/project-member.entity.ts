import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Entity('project_members')
@Unique(['projectId', 'userId']) // Ensure unique project-user combination
export class ProjectMember {
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
    enum: ProjectRole, 
    default: ProjectRole.MEMBER 
  })
  role: ProjectRole;

  @Column({ type: 'date', nullable: true })
  joinedAt: Date;

  @Column({ type: 'date', nullable: true })
  leftAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  permissions: {
    canCreateTask?: boolean;
    canEditTask?: boolean;
    canDeleteTask?: boolean;
    canAssignTask?: boolean;
    canViewAllTasks?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
