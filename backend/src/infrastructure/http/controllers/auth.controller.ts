import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { ClaimImportedAccountUseCase } from '../../../application/use-cases/claim-imported-account.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/get-current-user.use-case';
import { LoginUserUseCase } from '../../../application/use-cases/login-user.use-case';
import { LogoutUserUseCase } from '../../../application/use-cases/logout-user.use-case';
import { RefreshAuthSessionUseCase } from '../../../application/use-cases/refresh-auth-session.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../../application/use-cases/reset-password.use-case';
import { ClaimImportedAccountDto } from '../dtos/claim-imported-account.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginUserDto } from '../dtos/login-user.dto';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { AuthUserResponseDto } from '../dtos/auth-user-response.dto';
import { AuthUserMapper } from '../mappers/auth-user.mapper';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly refreshAuthSessionUseCase: RefreshAuthSessionUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly claimImportedAccountUseCase: ClaimImportedAccountUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a PantryList account' })
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const result = await this.registerUserUseCase.execute({
      email: registerUserDto.email,
      username: registerUserDto.username,
      password: registerUserDto.password,
      userAgent: request.headers['user-agent'] ?? null,
      ipAddress: request.ip,
    });
    this.authCookieService.setSessionCookies(reply, result.session);

    return AuthUserMapper.toResponse(result.user);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with PantryList credentials' })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const result = await this.loginUserUseCase.execute({
      email: loginUserDto.email,
      password: loginUserDto.password,
      userAgent: request.headers['user-agent'] ?? null,
      ipAddress: request.ip,
    });
    this.authCookieService.setSessionCookies(reply, result.session);

    return AuthUserMapper.toResponse(result.user);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get the current authenticated PantryList user' })
  async me(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AuthUserResponseDto> {
    return AuthUserMapper.toResponse(
      await this.getCurrentUserUseCase.execute(currentUser.userId),
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh the current authenticated session' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const refreshToken =
      this.authCookieService.getRefreshTokenFromRequest(request);
    const result = await this.refreshAuthSessionUseCase.execute(
      refreshToken ?? '',
    );
    this.authCookieService.setSessionCookies(reply, result.session);

    return AuthUserMapper.toResponse(result.user);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout the current authenticated session' })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    this.authCookieService.ensureXsrfForRequest(request);
    await this.logoutUserUseCase.execute(
      this.authCookieService.getRefreshTokenFromRequest(request),
    );
    this.authCookieService.clearSessionCookies(reply);

    return { message: 'Logged out successfully' };
  }

  @Post('password/forgot')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.requestPasswordResetUseCase.execute(forgotPasswordDto.email);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset a PantryList password with a valid token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.resetPasswordUseCase.execute(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );

    return { message: 'Password reset successfully' };
  }

  @Post('claim-imported-account')
  @HttpCode(200)
  @ApiOperation({ summary: 'Claim a legacy imported PantryList account' })
  async claimImportedAccount(
    @Body() claimImportedAccountDto: ClaimImportedAccountDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserResponseDto> {
    const result = await this.claimImportedAccountUseCase.execute({
      legacyUsername: claimImportedAccountDto.legacyUsername,
      email: claimImportedAccountDto.email,
      password: claimImportedAccountDto.password,
      finalUsername: claimImportedAccountDto.finalUsername,
      userAgent: request.headers['user-agent'] ?? null,
      ipAddress: request.ip,
    });
    this.authCookieService.setSessionCookies(reply, result.session);

    return AuthUserMapper.toResponse(result.user);
  }
}
