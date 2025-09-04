import { IsString, IsEmail, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username for login',
    example: 'admin',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Password for login',
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Username for registration',
    example: 'newuser',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Email for registration',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for registration',
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'User avatar image path (optional)',
    example: 'uploads/avatars/users/user-uuid_abc123.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldpassword123',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'refresh-token-string',
  })
  @IsString()
  refreshToken: string;
}

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'User avatar image path (optional)',
    example: 'uploads/avatars/users/user-uuid_abc123.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}
