import axios from 'axios';
import User from '../models/user.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken
} from '../utils/jwt.utils.js';
import logger from '../utils/logger.js';

// Redirect to GitHub OAuth Page
export const githubRedirect = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  
  if (!clientId || clientId === 'your_github_client_id_here') {
    logger.warn('GitHub client ID is not configured. Redirecting to mock login.');
    return res.redirect('/api/auth/mock');
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  res.redirect(githubAuthUrl);
};

// GitHub OAuth Callback
export const githubCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    logger.error('GitHub Callback: Auth code is missing in callback query params.');
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // 1. Exchange authorization code for GitHub access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token, error } = tokenResponse.data;
    if (error || !access_token) {
      logger.error(`GitHub token exchange failed: ${error || 'no token received'}`);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    // 2. Fetch User Details from GitHub API
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileResponse.data;

    // 3. Fetch User Emails to find the primary email
    let email = null;
    try {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primaryEmailObj = emailsResponse.data.find((e) => e.primary && e.verified);
      email = primaryEmailObj ? primaryEmailObj.email : (emailsResponse.data[0]?.email || null);
    } catch (emailError) {
      logger.warn(`Failed to fetch user emails from GitHub: ${emailError.message}`);
      email = profile.email || null;
    }

    // 4. Find or Create User in MongoDB with account linking
    let user = await User.findOne({ githubId: profile.id.toString() });
    if (!user) {
      // Check if user with same email exists
      if (email) {
        user = await User.findOne({ email });
      }

      if (user) {
        // Link GitHub to existing profile
        user.githubId = profile.id.toString();
        user.provider = 'both';
        user.username = user.username || profile.login;
        user.avatarUrl = user.avatarUrl || profile.avatar_url;
      } else {
        user = new User({
          githubId: profile.id.toString(),
          provider: 'github',
          username: profile.login,
          email,
          avatarUrl: profile.avatar_url,
        });
      }
    } else {
      user.username = profile.login;
      user.email = email || user.email;
      user.avatarUrl = profile.avatar_url || user.avatarUrl;
    }

    // 5. Generate Access & Refresh Tokens
    const clientAccessToken = generateAccessToken(user._id);
    const clientRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(clientRefreshToken);
    await user.save();

    // 6. Set HTTP-Only Cookie & Redirect
    setRefreshTokenCookie(res, clientRefreshToken);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${clientAccessToken}`);
  } catch (err) {
    logger.error(`GitHub authentication callback error: ${err.message}`);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

// Redirect to Google OAuth Page
export const googleRedirect = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  
  if (!clientId || clientId === 'your_google_client_id_here') {
    logger.warn('Google client ID is not configured. Redirecting to mock login.');
    return res.redirect('/api/auth/mock');
  }

  const scope = 'profile email';
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  res.redirect(googleAuthUrl);
};

// Google OAuth Callback
export const googleCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    logger.error('Google Callback: Auth code is missing in callback query params.');
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // 1. Exchange authorization code for Google access token
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      }
    );

    const { access_token, error } = tokenResponse.data;
    if (error || !access_token) {
      logger.error(`Google token exchange failed: ${error || 'no token received'}`);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    // 2. Fetch User Details from Google API
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileResponse.data;
    const { id: googleId, email, name, picture } = profile;

    if (!googleId) {
      logger.error('Google Callback: Google profile id is missing.');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_profile`);
    }

    // 3. Find or Create User in MongoDB with account linking
    let user = await User.findOne({ googleId });
    if (!user) {
      // Check if email already exists to link accounts
      if (email) {
        user = await User.findOne({ email });
      }
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.provider = 'both';
        user.username = user.username || name || email.split('@')[0];
        user.avatarUrl = user.avatarUrl || picture;
      } else {
        // Create new user
        user = new User({
          googleId,
          provider: 'google',
          username: name || email?.split('@')[0] || `google-user-${googleId.substring(0, 6)}`,
          email,
          avatarUrl: picture,
        });
      }
    } else {
      user.username = name || user.username;
      user.email = email || user.email;
      user.avatarUrl = picture || user.avatarUrl;
    }

    // 4. Generate Access & Refresh Tokens
    const clientAccessToken = generateAccessToken(user._id);
    const clientRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(clientRefreshToken);
    await user.save();

    // 5. Set HTTP-Only Cookie & Redirect
    setRefreshTokenCookie(res, clientRefreshToken);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${clientAccessToken}`);
  } catch (err) {
    logger.error(`Google authentication callback error: ${err.message}`);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

// Token Rotation (Silent Refresh)
export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Generate new rotated access/refresh tokens
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Atomically find the user having this exact active refresh token and replace it in the array
    const user = await User.findOneAndUpdate(
      { _id: decoded.userId, refreshTokens: refreshToken },
      { $set: { 'refreshTokens.$': newRefreshToken } },
      { new: true }
    );

    if (!user) {
      // Re-use or concurrent race condition detected. Clear user sessions to ensure security.
      const existingUser = await User.findById(decoded.userId);
      if (existingUser) {
        existingUser.refreshTokens = [];
        await existingUser.save();
        logger.warn(`Potential refresh token reuse or conflict detected for user ${decoded.userId}. Revoked all active tokens.`);
      }
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session expired or token reuse detected.' });
    }

    setRefreshTokenCookie(res, newRefreshToken);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    logger.error(`Refresh token rotation error: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Logout User
export const logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded) {
        await User.findByIdAndUpdate(decoded.userId, {
          $pull: { refreshTokens: refreshToken }
        });
      }
    } catch (error) {
      logger.error(`Logout database update error: ${error.message}`);
    }
  }

  clearRefreshTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
};

// Get Current User Profile Details
export const getMe = async (req, res) => {
  res.json(req.user);
};

// Development Mock Login Bypass Route
export const mockLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Mock login only allowed in development environment' });
  }

  try {
    let user = await User.findOne({
      $or: [
        { githubId: 'mock-github-id-12345' },
        { googleId: 'mock-google-id-12345' },
        { email: 'dev-user@example.com' }
      ]
    });
    
    if (!user) {
      user = new User({
        githubId: 'mock-github-id-12345',
        googleId: 'mock-google-id-12345',
        username: 'dev-user',
        email: 'dev-user@example.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4', // GitHub octocat fallback
      });
    } else {
      user.githubId = user.githubId || 'mock-github-id-12345';
      user.googleId = user.googleId || 'mock-google-id-12345';
    }

    const clientAccessToken = generateAccessToken(user._id);
    const clientRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(clientRefreshToken);
    await user.save();

    setRefreshTokenCookie(res, clientRefreshToken);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${clientAccessToken}`);
  } catch (error) {
    logger.error(`Mock login error: ${error.message}`);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=mock_failed`);
  }
};
