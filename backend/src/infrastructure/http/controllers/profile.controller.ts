import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { UpdateUserPreferencesUseCase } from '../../../application/use-cases/update-user-preferences.use-case';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '../dtos/profile-response.dto';
import { UpdateUserPreferencesDto } from '../dtos/update-user-preferences.dto';
import { ProfileMapper } from '../mappers/profile.mapper';

@Controller('profile')
@ApiTags('profile')
@UseGuards(AccessTokenGuard)
export class ProfileController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserPreferencesUseCase: UpdateUserPreferencesUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener perfil y preferencias del usuario' })
  async getProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserProfileResponseDto> {
    const profile = await this.getUserProfileUseCase.execute(
      currentUser.userId,
    );

    return ProfileMapper.toProfileResponse(profile);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Actualizar preferencias de PantryList' })
  async updatePreferences(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateUserPreferencesDto,
    @Req() request: FastifyRequest,
  ): Promise<UserPreferencesResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const preferences = await this.updateUserPreferencesUseCase.execute(
      currentUser.userId,
      dto,
    );

    return ProfileMapper.toPreferencesResponse(preferences);
  }
}
