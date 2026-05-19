import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { DeletePantryDataUseCase } from '../../../application/use-cases/delete-pantry-data.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { UpdateUserPreferencesUseCase } from '../../../application/use-cases/update-user-preferences.use-case';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  DeletePantryDataDto,
  DeletePantryDataResponseDto,
} from '../dtos/delete-pantry-data.dto';
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
    private readonly deletePantryDataUseCase: DeletePantryDataUseCase,
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

  @Delete('pantry-data')
  @ApiOperation({ summary: 'Eliminar datos locales de despensa del usuario' })
  async deletePantryData(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: DeletePantryDataDto,
    @Req() request: FastifyRequest,
  ): Promise<DeletePantryDataResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);

    return this.deletePantryDataUseCase.execute({
      userId: currentUser.userId,
      confirmationText: dto.confirmationText,
    });
  }
}
