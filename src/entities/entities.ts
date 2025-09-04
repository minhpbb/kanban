// This file contains only entity classes for TypeORM configuration
// Enums are exported separately in index.ts

import { User } from './user.entity';
import { Role } from './role.entity';
import { Module } from './module.entity';
import { Action } from './action.entity';
import { UserRole } from './user-role.entity';
import { RolePermission } from './role-permission.entity';
import { RefreshToken } from './refresh-token.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { ProjectMember } from './project-member.entity';
import { KanbanBoard } from './kanban-board.entity';
import { KanbanColumn } from './kanban-column.entity';
import { RecurringTask } from './recurring-task.entity';
import { TaskTemplate } from './task-template.entity';
import { TaskSchedule } from './task-schedule.entity';

// Export array of entity classes for TypeORM
export const entities = [
  User,
  Role,
  Module,
  Action,
  UserRole,
  RolePermission,
  RefreshToken,
  Project,
  Task,
  ProjectMember,
  KanbanBoard,
  KanbanColumn,
  RecurringTask,
  TaskTemplate,
  TaskSchedule,
];
