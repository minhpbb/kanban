import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has "all:all" permission (super admin)
    const hasAllAllPermission = await this.authService.hasPermission(
      user.userId,
      'all:all',
    );

    if (hasAllAllPermission) {
      return true; // Super admin can access everything
    }

    // Check specific permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.authService.hasPermission(
        user.userId,
        permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${permission}`,
        );
      }
    }

    return true;
  }
}
