import { DataSource } from 'typeorm';
import { Role, Module, Action, RolePermission, User, UserRole } from '../../entities';
import * as bcrypt from 'bcryptjs';

export class AuthSeeder {
  constructor(private dataSource: DataSource) {}

  async run() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create modules
      const modules = await this.createModules(queryRunner);
      
      // Create actions
      const actions = await this.createActions(queryRunner);
      
      // Create roles
      const roles = await this.createRoles(queryRunner);
      
      // Create role permissions (admin gets all permissions)
      await this.createRolePermissions(queryRunner, roles.admin, modules, actions);
      
      // Create admin user
      const adminUser = await this.createAdminUser(queryRunner);
      
      // Assign admin role to admin user
      await this.assignAdminRole(queryRunner, adminUser, roles.admin);

      await queryRunner.commitTransaction();
      console.log('Auth seeding completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Auth seeding failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createModules(queryRunner: any) {
    const moduleData = [
      { name: 'all', description: 'All modules (wildcard)' },
      { name: 'auth', description: 'Authentication module' },
      { name: 'user', description: 'User management module' },
      { name: 'role', description: 'Role management module' },
      { name: 'permission', description: 'Permission management module' },
      { name: 'kanban', description: 'Kanban board module' },
      { name: 'project', description: 'Project management module' },
      { name: 'task', description: 'Task management module' },
    ];

    const modules: Record<string, Module> = {};
    for (const data of moduleData) {
      const module = queryRunner.manager.create(Module, data);
      const savedModule = await queryRunner.manager.save(module);
      modules[data.name] = savedModule;
    }

    return modules;
  }

  private async createActions(queryRunner: any) {
    const actionData = [
      { name: 'all', description: 'All actions (wildcard)' },
      { name: 'create', description: 'Create action' },
      { name: 'read', description: 'Read action' },
      { name: 'update', description: 'Update action' },
      { name: 'delete', description: 'Delete action' },
      { name: 'list', description: 'List action' },
      { name: 'approve', description: 'Approve action' },
      { name: 'reject', description: 'Reject action' },
    ];

    const actions: Record<string, Action> = {};
    for (const data of actionData) {
      const action = queryRunner.manager.create(Action, data);
      const savedAction = await queryRunner.manager.save(action);
      actions[data.name] = savedAction;
    }

    return actions;
  }

  private async createRoles(queryRunner: any) {
    const roleData = [
      { name: 'admin', description: 'Administrator with full access' },
      { name: 'user', description: 'Regular user with limited access' },
      { name: 'manager', description: 'Manager with project access' },
    ];

    const roles: Record<string, Role> = {};
    for (const data of roleData) {
      const role = queryRunner.manager.create(Role, data);
      const savedRole = await queryRunner.manager.save(role);
      roles[data.name] = savedRole;
    }

    return roles;
  }

  private async createRolePermissions(
    queryRunner: any,
    adminRole: Role,
    modules: any,
    actions: any,
  ) {
    // Admin gets all permissions for all modules
    for (const moduleName in modules) {
      for (const actionName in actions) {
        const rolePermission = queryRunner.manager.create(RolePermission, {
          roleId: adminRole.id,
          moduleId: modules[moduleName].id,
          actionId: actions[actionName].id,
        });
        await queryRunner.manager.save(rolePermission);
      }
    }

    // Note: 'all:all' permission is already created above in the loop
    // No need to create it again

    // User role gets basic permissions
    const userRole = await queryRunner.manager.findOne(Role, {
      where: { name: 'user' },
    });

    const basicPermissions = [
      { module: 'kanban', actions: ['read', 'list'] },
      { module: 'project', actions: ['read', 'list'] },
      { module: 'task', actions: ['read', 'list', 'create', 'update'] },
    ];

    for (const permission of basicPermissions) {
      for (const actionName of permission.actions) {
        const rolePermission = queryRunner.manager.create(RolePermission, {
          roleId: userRole.id,
          moduleId: modules[permission.module].id,
          actionId: actions[actionName].id,
        });
        await queryRunner.manager.save(rolePermission);
      }
    }
  }

  private async createAdminUser(queryRunner: any) {
    const hashedPassword = await bcrypt.hash('admin@2025', 12);
    
    const adminUser = queryRunner.manager.create(User, {
      username: 'admin',
      email: 'admin@kanban.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      isActive: true,
    });

    return await queryRunner.manager.save(adminUser);
  }

  private async assignAdminRole(queryRunner: any, adminUser: User, adminRole: Role) {
    const userRole = queryRunner.manager.create(UserRole, {
      userId: adminUser.id,
      roleId: adminRole.id,
    });

    await queryRunner.manager.save(userRole);
  }
}
