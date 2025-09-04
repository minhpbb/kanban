import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AvatarType {
  USER = 'user',
  PROJECT = 'project',
}

export class UploadAvatarDto {
  @ApiProperty({
    description: 'Type of avatar to upload',
    enum: AvatarType,
    example: AvatarType.USER,
  })
  @IsEnum(AvatarType)
  type: AvatarType;

  @ApiProperty({
    description: 'ID of the user or project',
    example: 'uuid-string',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'Description or note for the avatar',
    required: false,
    example: 'Profile picture updated',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AvatarResponseDto {
  @ApiProperty({
    description: 'Avatar file path',
    example: 'uploads/avatars/users/user-uuid_abc123.jpg',
  })
  avatarPath: string;

  @ApiProperty({
    description: 'Avatar file URL',
    example: '/uploads/avatars/users/user-uuid_abc123.jpg',
  })
  avatarUrl: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiProperty({
    description: 'File type',
    example: 'image/jpeg',
  })
  mimeType: string;
}
