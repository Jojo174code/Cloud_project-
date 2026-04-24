import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { buildAuthResponse, registerUser, loginUser } from '../services/authService';

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
