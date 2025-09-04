import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Request,
  Res,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ServerResponse } from 'http';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';
import { NotificationStatus } from '../entities/notification.entity';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('sse')
  @RequirePermissions('notification:read')
  @ApiOperation({ 
    summary: 'SSE connection for real-time notifications', 
    description: 'Establish Server-Sent Events connection for real-time notifications' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'SSE connection established',
    headers: {
      'Content-Type': { description: 'text/event-stream' },
      'Cache-Control': { description: 'no-cache' },
      'Connection': { description: 'keep-alive' },
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async getSSEConnection(@Request() req, @Res() res: Response) {
    const serverResponse = res as unknown as ServerResponse;
    const userId = req.user.userId;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: 'SSE connection established',
      userId,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    // Add client to SSE connections
    this.notificationsService.addSSEClient(userId, serverResponse);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        })}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        this.notificationsService.removeSSEClient(userId, res);
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Clean up on connection close
    req.on('close', () => {
      clearInterval(heartbeat);
      this.notificationsService.removeSSEClient(userId, serverResponse);
    });
  }

  @Get()
  @RequirePermissions('notification:read')
  @ApiOperation({ 
    summary: 'Get user notifications', 
    description: 'Get paginated list of user notifications' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus, description: 'Filter by status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notifications retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          notifications: [
            {
              id: 1,
              type: 'task_assigned',
              title: 'Task Assigned',
              message: 'John Doe assigned you to task "Fix login bug" in project "My Project"',
              status: 'unread',
              metadata: {
                projectName: 'My Project',
                taskTitle: 'Fix login bug',
                fromUserName: 'John Doe',
                fromUserAvatar: 'uploads/avatars/users/user-1_abc123.jpg'
              },
              createdAt: '2024-01-01T00:00:00.000Z'
            }
          ],
          total: 10,
          unreadCount: 3
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async getNotifications(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.notificationsService.getUserNotifications(req.user.userId, page, limit, status);
  }

  @Patch(':id/read')
  @RequirePermissions('notification:update')
  @ApiOperation({ 
    summary: 'Mark notification as read', 
    description: 'Mark a specific notification as read' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification marked as read',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Notification marked as read'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async markAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @Request() req,
  ) {
    return this.notificationsService.markAsRead(notificationId, req.user.userId);
  }

  @Patch('read-all')
  @RequirePermissions('notification:update')
  @ApiOperation({ 
    summary: 'Mark all notifications as read', 
    description: 'Mark all user notifications as read' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All notifications marked as read',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'All notifications marked as read'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/archive')
  @RequirePermissions('notification:update')
  @ApiOperation({ 
    summary: 'Archive notification', 
    description: 'Archive a specific notification' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification archived',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Notification archived'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async archiveNotification(
    @Param('id', ParseIntPipe) notificationId: number,
    @Request() req,
  ) {
    return this.notificationsService.archiveNotification(notificationId, req.user.userId);
  }
}
