import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanService } from './kanban.service';
import { KanbanController } from './kanban.controller';
import { KanbanBoard } from '../entities/kanban-board.entity';
import { KanbanColumn } from '../entities/kanban-column.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KanbanBoard, KanbanColumn, Project, ProjectMember]),
  ],
  controllers: [KanbanController],
  providers: [KanbanService],
  exports: [KanbanService],
})
export class KanbanModule {}
