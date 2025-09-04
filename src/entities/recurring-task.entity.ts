import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('recurring_tasks')
export class RecurringTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  projectId: number;

  @Column({ type: 'int' })
  @Index()
  templateTaskId: number; // Reference to original task

  @Column({ type: 'enum', enum: RecurrenceType })
  recurrenceType: RecurrenceType; // daily, weekly, monthly, yearly

  @Column({ type: 'json' })
  recurrenceConfig: {
    interval: number;        // Every X days/weeks/months
    daysOfWeek?: number[];   // [1,3,5] for Monday, Wednesday, Friday
    dayOfMonth?: number;     // 15 for 15th of every month
    endDate?: Date;          // Stop recurring after this date
    maxOccurrences?: number; // Stop after X occurrences
  };

  @Column({ type: 'date' })
  @Index()
  nextDueDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  generatedCount: number; // Number of tasks generated so far

  @Column({ type: 'date', nullable: true })
  lastGeneratedDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
