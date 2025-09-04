import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  HttpException,
  Put,
} from '@nestjs/common';
import { Response } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ChangePasswordDto, RefreshTokenDto, UpdateUserProfileDto } from './dto/auth.dto';
import { RequirePermissions } from './decorators/permission.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { jwtConfig } from '../config/jwt.config';
import { ERROR_CODES, ERROR_MESSAGES } from '../common/constants/error-codes';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login', 
    description: 'Authenticate user with username and password, returns JWT tokens in cookies' 
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            fullName: 'Administrator',
            avatar: 'uploads/avatars/users/user-1_abc123.jpg'
          },
          message: 'Login successful'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials',
    schema: {
      example: {
        errCode: 'E003',
        reason: 'Invalid username or password',
        result: 'ERROR',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/login',
        method: 'POST'
      }
    }
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set cookies
    res.cookie(jwtConfig.cookie.accessTokenName, result.accessToken, {
      httpOnly: jwtConfig.cookie.httpOnly,
      secure: jwtConfig.cookie.secure,
      sameSite: jwtConfig.cookie.sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(jwtConfig.cookie.refreshTokenName, result.refreshToken, {
      httpOnly: jwtConfig.cookie.httpOnly,
      secure: jwtConfig.cookie.secure,
      sameSite: jwtConfig.cookie.sameSite,
      maxAge: jwtConfig.cookie.maxAge,
    });

    return {
      user: result.user,
      message: 'Login successful',
    };
  }

  @Post('register')
  @ApiOperation({ 
    summary: 'User registration', 
    description: 'Register a new user account with optional avatar' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          user: {
            id: 2,
            username: 'newuser',
            email: 'newuser@example.com',
            fullName: 'New User',
            avatar: 'uploads/avatars/users/user-2_abc123.jpg'
          },
          message: 'User registered successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error or user already exists',
    schema: {
      example: {
        errCode: 'E010',
        reason: 'Validation error',
        result: 'ERROR',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/register',
        method: 'POST'
      }
    }
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh access token', 
    description: 'Refresh access token using refresh token from cookies' 
  })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Token refreshed successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Refresh token not found or expired',
    schema: {
      example: {
        errCode: 'E004',
        reason: 'Token has expired',
        result: 'ERROR',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/refresh',
        method: 'POST'
      }
    }
  })
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[jwtConfig.cookie.refreshTokenName];
    
    if (!refreshToken) {
      throw new HttpException(
        ERROR_MESSAGES[ERROR_CODES.TOKEN_EXPIRED], 
        HttpStatus.UNAUTHORIZED
      );
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await this.authService.refreshToken(
      { refreshToken },
      ipAddress,
      userAgent,
    );

    // Set new cookies
    res.cookie(jwtConfig.cookie.accessTokenName, result.accessToken, {
      httpOnly: jwtConfig.cookie.httpOnly,
      secure: jwtConfig.cookie.secure,
      sameSite: jwtConfig.cookie.sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(jwtConfig.cookie.refreshTokenName, result.refreshToken, {
      httpOnly: jwtConfig.cookie.httpOnly,
      secure: jwtConfig.cookie.secure,
      sameSite: jwtConfig.cookie.sameSite,
      maxAge: jwtConfig.cookie.maxAge,
    });

    return { message: 'Token refreshed successfully' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'User logout', 
    description: 'Logout user and clear cookies' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Logged out successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[jwtConfig.cookie.refreshTokenName];
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie(jwtConfig.cookie.accessTokenName);
    res.clearCookie(jwtConfig.cookie.refreshTokenName);

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Logout from all devices', 
    description: 'Logout user from all devices and revoke all refresh tokens' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out from all devices successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Logged out from all devices successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async logoutAll(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.userId);

    // Clear cookies
    res.clearCookie(jwtConfig.cookie.accessTokenName);
    res.clearCookie(jwtConfig.cookie.refreshTokenName);

    return { message: 'Logged out from all devices successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ 
    summary: 'Change password', 
    description: 'Change user password (requires current password)' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Password changed successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiBadRequestResponse({ description: 'Invalid current password' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ 
    summary: 'Update user profile', 
    description: 'Update user profile information including avatar' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            fullName: 'Updated Name',
            avatar: 'uploads/avatars/users/user-1_abc123.jpg'
          },
          message: 'Profile updated successfully'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ 
    summary: 'Get user profile', 
    description: 'Get current user profile information' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          message: 'Profile endpoint',
          userId: 1
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getProfile(@Request() req) {
    // This would typically return user profile with roles and permissions
    return { message: 'Profile endpoint', userId: req.user.userId };
  }

  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  @RequirePermissions('auth:read')
  @ApiOperation({ 
    summary: 'Get user permissions', 
    description: 'Get current user permissions and roles' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({ 
    status: 200, 
    description: 'User permissions retrieved successfully',
    schema: {
      example: {
        errCode: 'E000',
        reason: 'Success',
        result: 'SUCCESS',
        data: {
          permissions: [
            {
              module: 'auth',
              action: 'read',
              granted: true
            }
          ]
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiForbiddenResponse({ 
    description: 'Insufficient permissions',
    schema: {
      example: {
        errCode: 'E005',
        reason: 'Insufficient permissions',
        result: 'ERROR',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/auth/permissions',
        method: 'GET'
      }
    }
  })
  async getUserPermissions(@Request() req) {
    const permissions = await this.authService.getUserPermissions(req.user.userId);
    return { permissions };
  }
}
