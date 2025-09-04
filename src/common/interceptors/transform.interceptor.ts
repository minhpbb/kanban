import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/error-codes';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        errCode: ERROR_CODES.SUCCESS,
        reason: ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        result: 'SUCCESS' as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
