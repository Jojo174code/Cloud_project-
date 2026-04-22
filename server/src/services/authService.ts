import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  role: keyof typeof UserRole; // 'TENANT' | 'MANAGER'
}

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
      role: data.role as any,
    },
  });
  return user;
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
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
  return token;
};
