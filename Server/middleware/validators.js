import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const raw = result.array();

    const errors = raw.map(err => {
      const field = err.param ?? err.path ?? (err.nestedErrors && err.nestedErrors[0]?.param) ?? err.location ?? 'field';
      return { field, msg: err.msg };
    });

    const message = errors.map(e => `${e.field}: ${e.msg}`).join(' | ');
    return res.status(400).json({ success: false, message, errors });
  }
  next();
};

export const registerValidation = [
    body('name', 'Name is required').trim().notEmpty(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 8 or more characters').isLength({ min: 8 }),
];

export const loginValidation = [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').exists(),
];

export const verifyAccountValidation = [
    body('otp', 'OTP is required and must be 6 digits').isLength({ min: 6, max: 6 }),
];

export const sendResetOtpValidation = [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
];

export const resetPasswordValidation = [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('otp', 'OTP is required and must be 6 digits').isLength({ min: 6, max: 6 }),
    body('newPassword', 'New password must be 8 or more characters').isLength({ min: 8 }),
];