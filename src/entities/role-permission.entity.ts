import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('role_permissions')
@Index(['roleId', 'moduleId', 'actionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  roleId: number;

  @Column({ type: 'int' })
  moduleId: number;

  @Column({ type: 'int' })
  actionId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
