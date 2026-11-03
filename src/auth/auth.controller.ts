import { Body, Controller, Post, Put, Req, UseGuards, Get, Param, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AuthenticationGuard } from '../guards/authentication.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async signUp(@Body() signupData: SignupDto) {
    return this.authService.signup(signupData);
  }

  @Post('login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthenticationGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    return this.authService.getUserProfile(req.userId);
  }


  // Admin-only endpoints
  @UseGuards(AuthenticationGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('pending-users')
  async getPendingUsers(@Req() req) {
    return this.authService.getPendingUsers(req.user.userId);
  }

  
  @UseGuards(AuthenticationGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('all-users')
  async getAllUsers(@Req() req) {
    return this.authService.getAllUsers(req.user.userId);
  }

  @UseGuards(AuthenticationGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Put('update-status')
  async updateUserStatus(@Body() updateStatusDto: UpdateUserStatusDto, @Req() req) {
    return this.authService.updateUserStatus(
      req.user.userId,
      updateStatusDto.email,
      updateStatusDto.status,
    );
  }

  @UseGuards(AuthenticationGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('users-by-role/:role')
  async getUsersByRole(@Param('role') role: UserRole, @Req() req) {
    return this.authService.getUsersByRole(req.userId, role);
  }
}