import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

@Entity('task_schedules')
export class TaskSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  recurringTaskId: number; // Reference to recurring task

  @Column({ type: 'int' })
  generatedTaskId: number; // Reference to actual task instance

  @Column({ type: 'date' })
  scheduledDate: Date; // When this task should be created

  @Column({ type: 'date', nullable: true })
  actualCreatedDate: Date; // When task was actually created

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'json', nullable: true })
  customOverrides: object; // Override default values from template

  @Column({ type: 'text', nullable: true })
  notes: string; // Additional notes for this specific instance

  @Column({ type: 'boolean', default: false })
  isManuallyCreated: boolean; // Was this created manually or automatically

  @Column({ type: 'int', nullable: true })
  createdByUserId: number; // Who created this specific instance

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
