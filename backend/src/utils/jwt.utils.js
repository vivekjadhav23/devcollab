import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || 'devcollab_access_secret_key_12345!@#',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'devcollab_refresh_secret_key_67890!@#',
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'devcollab_access_secret_key_12345!@#');
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'devcollab_refresh_secret_key_67890!@#');
  } catch (error) {
    return null;
  }
};

export const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Use 'lax' for local development OAuth redirect cookies
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
};
