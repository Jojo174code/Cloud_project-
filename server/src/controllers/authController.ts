import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/authService';

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const user = await registerUser({ full_name, email, password, role });
    // Do not return passwordHash
    const { password_hash, ...safeUser } = user as any;
    res.status(201).json(safeUser);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: 'Unauthenticated' });
  // fetch user info
  const prisma = new (await import('@prisma/client')).PrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, full_name: true, email: true, role: true },
  });
  if (!dbUser) return res.status(404).json({ message: 'User not found' });
  res.json(dbUser);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }
  try {
    const token = await loginUser(email, password);
    res.json({ token });
  } catch (err: any) {
    res.status(401).json({ message: err.message || 'Invalid credentials' });
  }
};
