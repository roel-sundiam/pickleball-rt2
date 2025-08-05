import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export const generateToken = (userId: Types.ObjectId, username: string, role: string): string => {
  const payload: JwtPayload = {
    userId: userId.toString(),
    username,
    role
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  const expiresIn = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string => {
  if (!authHeader) {
    throw new Error('Authorization header is missing');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header must start with Bearer');
  }

  const token = authHeader.substring(7);
  if (!token) {
    throw new Error('Token is missing from authorization header');
  }

  return token;
};