import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// /me requires authentication
import { authenticateJwt } from '../middleware/auth';
router.get('/me', authenticateJwt, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: 'Unauthenticated' });
  const prisma = new (await import('@prisma/client')).PrismaClient();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, full_name: true, email: true, role: true } });
  if (!dbUser) return res.status(404).json({ message: 'User not found' });
  res.json(dbUser);
});

export default router;
