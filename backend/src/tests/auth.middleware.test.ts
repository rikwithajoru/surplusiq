import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth';

const SECRET = 'test-secret';

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  jest.clearAllMocks();
});

describe('authenticateToken', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = mockReq();
    const res = mockRes();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = jwt.sign({ id: 'u1', role: 'ngo' }, SECRET, { expiresIn: -1 });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 401 for a token signed with wrong secret', () => {
    const token = jwt.sign({ id: 'u1', role: 'ngo' }, 'wrong-secret');
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('attaches req.user and calls next for a valid token', () => {
    const token = jwt.sign({ id: 'u1', role: 'restaurant' }, SECRET);
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({ id: 'u1', role: 'restaurant' });
  });
});

describe('requireRole', () => {
  it('returns 403 when req.user is absent', () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('returns 403 when role does not match', () => {
    const req = { headers: {}, user: { id: 'u1', role: 'ngo' } } as unknown as Request;
    const res = mockRes();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when role matches', () => {
    const req = { headers: {}, user: { id: 'u1', role: 'admin' } } as unknown as Request;
    const res = mockRes();
    requireRole('admin', 'restaurant')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
