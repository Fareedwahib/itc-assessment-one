import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserRole, UserStatus } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async signup(signupData: SignupDto) {
    const { email, password, name, role, phone } = signupData;

    const emailInUse = await this.userRepository.findOne({
      where: { email },
    });
    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let status = UserStatus.ACTIVE;
    if (role === UserRole.INTERN || role === UserRole.STUDENT) {
      status = UserStatus.PENDING_APPROVAL;
    }

    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
      status,
      phone,
    });

    await this.userRepository.save(user);

    let message = 'User created successfully';
    if (status === UserStatus.PENDING_APPROVAL) {
      message = 'Account created successfully. Pending admin approval.';
    }

    return {
      message,
      userId: user.id,
      role: user.role,
      status: user.status,
    };
  }

  async login(credentials: LoginDto) {
    const { email, password } = credentials;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Wrong credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account has been suspended');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Account is inactive');
    }
    if (user.status === UserStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Account is pending approval');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    const tokens = await this.generateUserTokens(user);
    return {
      ...tokens,
      userId: user.id,
      role: user.role,
      status: user.status,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: { userId: string; type?: string };

    try {
      payload = this.jwtService.verify(refreshToken, {
        clockTolerance: 300,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        userId: payload.userId,
        expiryDate: MoreThan(new Date()),
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateUserTokens(user);
  }

  async generateUserTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { userId: user.id, role: user.role },
      {
        expiresIn: '5m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      {
        expiresIn: '3d',
      },
    );

    await this.storeRefreshToken(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async storeRefreshToken(token: string, userId: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const existingToken = await this.refreshTokenRepository.findOne({
      where: { userId },
    });

    if (existingToken) {
      existingToken.token = token;
      existingToken.expiryDate = expiryDate;
      await this.refreshTokenRepository.save(existingToken);
      return;
    }

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token,
      userId,
      expiryDate,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  async updateUserStatus(adminUserId: string, targetUserEmail: string, status: UserStatus) {
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update user status');
    }

    const targetUser = await this.userRepository.findOne({ where: { email: targetUserEmail } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    targetUser.status = status;
    await this.userRepository.save(targetUser);
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getPendingUsers(adminUserId: string) {
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view pending users');
    }

    const pendingUsers = await this.userRepository.find({
      where: { status: UserStatus.PENDING_APPROVAL },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });

    return pendingUsers;
  }

  async getAllUsers(adminUserId: string) {
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view all users');
    }

    const users = await this.userRepository.find({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });

    return users;
  }

  async getUsersByRole(adminUserId: string, role: UserRole) {
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view users by role');
    }

    const users = await this.userRepository.find({
      where: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });

    return users;
  }
}
