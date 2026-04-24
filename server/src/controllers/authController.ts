import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { buildAuthResponse, registerUser, loginUser, getUserById } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

const isValidRole = (role: unknown): role is keyof typeof UserRole => {
  return role === UserRole.TENANT || role === UserRole.MANAGER;
};

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password, role } = req.body;
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!isValidRole(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await registerUser({ full_name, email, password, role });
    res.status(201).json(buildAuthResponse(user));
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }
  try {
    const auth = await loginUser(email, password);
    res.json(auth);
  } catch (err: any) {
    res.status(401).json({ message: err.message || 'Invalid credentials' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch user' });
  }
};
