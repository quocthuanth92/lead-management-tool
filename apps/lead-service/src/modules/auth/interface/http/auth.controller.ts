import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginResponse } from '@lead/shared-contracts';

import { ErrorResponseModel, LoginResponseModel } from '../../../../common/openapi/openapi.models';
import { AuthService } from '../../application/auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in a salesperson' })
  @ApiOkResponse({ description: 'Signed in', type: LoginResponseModel })
  @ApiResponse({ status: 400, description: 'Invalid credentials format', type: ErrorResponseModel })
  @ApiResponse({ status: 401, description: 'Invalid email or password', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body);
  }
}
