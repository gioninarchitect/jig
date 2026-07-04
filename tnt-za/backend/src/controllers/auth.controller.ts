import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';

export async function requestPin(req: AuthRequest, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const result = await authService.requestPin(email, req.ip);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

export async function verifyPin(req: AuthRequest, res: Response) {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ success: false, error: 'Email and PIN are required' });

    const result = await authService.verifyPin(email, pin, req.ip);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

export async function flocoreOtpRequest(req: AuthRequest, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const result = await authService.requestFlocoreOtp(email);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

export async function flocoreOtpVerify(req: AuthRequest, res: Response) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email and code are required' });
    const result = await authService.verifyFlocoreOtp(email, code, req.ip);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
    await authService.logout(req.user.userId);
    res.json({ success: true, message: 'Logged out' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}
