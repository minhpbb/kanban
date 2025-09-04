import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServerResponse } from 'http';
import { Notification, NotificationType, NotificationStatus } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

export interface NotificationData {
  userId: number;
  projectId?: number;
  taskId?: number;
  fromUserId?: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private sseClients = new Map<number, ServerResponse[]>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  // ========== SSE CONNECTION MANAGEMENT ==========

  addSSEClient(userId: number, response: ServerResponse): void {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, []);
    }
    this.sseClients.get(userId)!.push(response);

    // Remove client when connection closes
    response.on('close', () => {
      this.removeSSEClient(userId, response);
    });
  }

  removeSSEClient(userId: number, response: ServerResponse): void {
    const clients = this.sseClients.get(userId);
    if (clients) {
      const index = clients.indexOf(response);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        this.sseClients.delete(userId);
      }
    }
  }

  // ========== NOTIFICATION CREATION ==========

  async createNotification(data: NotificationData): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...data,
      status: NotificationStatus.UNREAD,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send real-time notification via SSE
    await this.sendSSENotification(data.userId, savedNotification);

    return savedNotification;
  }

  async createProjectInviteNotification(
    userId: number,
    projectId: number,
    fromUserId: number,
    role: string,
  ): Promise<Notification> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });

    return this.createNotification({
      userId,
      projectId,
      fromUserId,
      type: NotificationType.PROJECT_INVITE,
      title: 'Project Invitation',
      message: `${fromUser?.fullName || fromUser?.username} invited you to join project "${project?.name}" as ${role}`,
      metadata: {
        projectName: project?.name,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
        role,
      },
    });
  }

  async createProjectMemberAddedNotification(
    userId: number,
    projectId: number,
    fromUserId: number,
    role: string,
  ): Promise<Notification> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });

    return this.createNotification({
      userId,
      projectId,
      fromUserId,
      type: NotificationType.PROJECT_MEMBER_ADDED,
      title: 'Added to Project',
      message: `${fromUser?.fullName || fromUser?.username} added you to project "${project?.name}" as ${role}`,
      metadata: {
        projectName: project?.name,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
        role,
      },
    });
  }

  async createProjectMemberRemovedNotification(
    userId: number,
    projectId: number,
    fromUserId: number,
  ): Promise<Notification> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });

    return this.createNotification({
      userId,
      projectId,
      fromUserId,
      type: NotificationType.PROJECT_MEMBER_REMOVED,
      title: 'Removed from Project',
      message: `${fromUser?.fullName || fromUser?.username} removed you from project "${project?.name}"`,
      metadata: {
        projectName: project?.name,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
      },
    });
  }

  async createTaskAssignedNotification(
    userId: number,
    taskId: number,
    fromUserId: number,
  ): Promise<Notification> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });
    const project = await this.projectRepository.findOne({ where: { id: task?.projectId } });

    return this.createNotification({
      userId,
      projectId: task?.projectId,
      taskId,
      fromUserId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task Assigned',
      message: `${fromUser?.fullName || fromUser?.username} assigned you to task "${task?.title}" in project "${project?.name}"`,
      metadata: {
        projectName: project?.name,
        taskTitle: task?.title,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
      },
    });
  }

  async createTaskUnassignedNotification(
    userId: number,
    taskId: number,
    fromUserId: number,
  ): Promise<Notification> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });
    const project = await this.projectRepository.findOne({ where: { id: task?.projectId } });

    return this.createNotification({
      userId,
      projectId: task?.projectId,
      taskId,
      fromUserId,
      type: NotificationType.TASK_UNASSIGNED,
      title: 'Task Unassigned',
      message: `${fromUser?.fullName || fromUser?.username} unassigned you from task "${task?.title}" in project "${project?.name}"`,
      metadata: {
        projectName: project?.name,
        taskTitle: task?.title,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
      },
    });
  }

  async createTaskMovedNotification(
    userId: number,
    taskId: number,
    fromUserId: number,
    oldColumnName: string,
    newColumnName: string,
  ): Promise<Notification> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });
    const project = await this.projectRepository.findOne({ where: { id: task?.projectId } });

    return this.createNotification({
      userId,
      projectId: task?.projectId,
      taskId,
      fromUserId,
      type: NotificationType.TASK_MOVED,
      title: 'Task Moved',
      message: `${fromUser?.fullName || fromUser?.username} moved task "${task?.title}" from "${oldColumnName}" to "${newColumnName}"`,
      metadata: {
        projectName: project?.name,
        taskTitle: task?.title,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
        oldColumnName,
        columnName: newColumnName,
      },
    });
  }

  async createTaskCommentedNotification(
    userId: number,
    taskId: number,
    fromUserId: number,
  ): Promise<Notification> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });
    const project = await this.projectRepository.findOne({ where: { id: task?.projectId } });

    return this.createNotification({
      userId,
      projectId: task?.projectId,
      taskId,
      fromUserId,
      type: NotificationType.TASK_COMMENTED,
      title: 'New Comment',
      message: `${fromUser?.fullName || fromUser?.username} commented on task "${task?.title}" in project "${project?.name}"`,
      metadata: {
        projectName: project?.name,
        taskTitle: task?.title,
        fromUserName: fromUser?.fullName || fromUser?.username,
        fromUserAvatar: fromUser?.avatar,
      },
    });
  }

  // ========== NOTIFICATION RETRIEVAL ==========

  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    status?: NotificationStatus,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const offset = (page - 1) * limit;

    let query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (status) {
      query = query.andWhere('notification.status = :status', { status });
    }

    const [notifications, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const unreadCount = await this.notificationRepository.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: number, userId: number): Promise<{ message: string }> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { 
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: number): Promise<{ message: string }> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { 
        status: NotificationStatus.READ,
        readAt: new Date(),
      }
    );

    return { message: 'All notifications marked as read' };
  }

  async archiveNotification(notificationId: number, userId: number): Promise<{ message: string }> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { 
        status: NotificationStatus.ARCHIVED,
        archivedAt: new Date(),
      }
    );

    return { message: 'Notification archived' };
  }

  // ========== SSE NOTIFICATION SENDING ==========

  private async sendSSENotification(userId: number, notification: Notification): Promise<void> {
    const clients = this.sseClients.get(userId);
    if (clients && clients.length > 0) {
      const sseData = `data: ${JSON.stringify({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      })}\n\n`;

      // Send to all connected clients for this user
      clients.forEach(client => {
        try {
          client.write(sseData);
        } catch (error) {
          // Remove broken connections
          this.removeSSEClient(userId, client);
        }
      });
    }
  }
}
