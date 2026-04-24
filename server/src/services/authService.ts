import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  role: keyof typeof UserRole;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  fullName: string;
}

const signAuthToken = (payload: JwtPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
};

export const registerUser = async (data: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error('User already exists');
  }
  const password_hash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      full_name: data.full_name,
      email: data.email,
      password_hash,
      role: data.role,
    },
  });
  return user;
};

export const buildAuthResponse = (user: { id: string; role: UserRole; full_name: string }) => {
  const token = signAuthToken({
    userId: user.id,
    role: user.role,
    fullName: user.full_name,
  });

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
    },
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  return buildAuthResponse(user);
};
