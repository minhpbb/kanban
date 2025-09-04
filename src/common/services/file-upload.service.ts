import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, unlink, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);

@Injectable()
export class FileUploadService {
  private readonly uploadsDir = 'uploads';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  /**
   * Upload avatar image for user or project
   */
  async uploadAvatar(
    file: Express.Multer.File,
    type: 'user' | 'project',
    entityId: string,
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = extname(file.originalname).toLowerCase();
    const filename = `${entityId}_${uuidv4()}${fileExtension}`;
    
    // Determine upload path
    const uploadPath = join(this.uploadsDir, 'avatars', type === 'user' ? 'users' : 'projects');
    
    // Ensure directory exists
    this.ensureDirectoryExists(uploadPath);
    
    // Full file path
    const filePath = join(uploadPath, filename);
    
    try {
      // Write file
      await writeFileAsync(filePath, file.buffer);
      
      // Return relative path for database storage
      return filePath.replace(/\\/g, '/'); // Convert Windows path to Unix style
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Delete avatar file
   */
  async deleteAvatar(avatarPath: string): Promise<void> {
    if (!avatarPath) return;

    try {
      const fullPath = join(process.cwd(), avatarPath);
      if (existsSync(fullPath)) {
        await unlinkAsync(fullPath);
      }
    } catch (error) {
      // Log error but don't throw (file might not exist)
      console.error('Failed to delete avatar file:', error);
    }
  }

  /**
   * Upload temporary file
   */
  async uploadTempFile(file: Express.Multer.File): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${fileExtension}`;
    
    // Upload to temp directory
    const uploadPath = join(this.uploadsDir, 'temp');
    this.ensureDirectoryExists(uploadPath);
    
    const filePath = join(uploadPath, filename);
    
    try {
      await writeFileAsync(filePath, file.buffer);
      return filePath.replace(/\\/g, '/');
    } catch (error) {
      throw new BadRequestException('Failed to upload temporary file');
    }
  }

  /**
   * Clean up temporary files older than specified hours
   */
  async cleanupTempFiles(hoursOld: number = 24): Promise<void> {
    // This would be implemented with a cron job
    // For now, just a placeholder
    console.log(`Cleaning up temp files older than ${hoursOld} hours`);
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    const fileExtension = extname(file.originalname).toLowerCase();
    if (!this.allowedImageTypes.includes(fileExtension)) {
      throw new BadRequestException(`File type ${fileExtension} not allowed. Allowed types: ${this.allowedImageTypes.join(', ')}`);
    }
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get file info
   */
  getFileInfo(filePath: string): { filename: string; extension: string; size: number } {
    const filename = filePath.split('/').pop() || '';
    const extension = extname(filename);
    return {
      filename,
      extension,
      size: 0, // Would need to implement file size checking
    };
  }
}
