import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT Authentication Middleware
export const isAuth = (req, res, next) => {
  try {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    
    if (!token) {
      return res.status(401).json({
        message: "Please login to access this resource"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SEC || "secret_key");
    if (!decoded) {
      return res.status(401).json({
        message: "Token expired or invalid"
      });
    }

    // Attach basic decoded user info to the request
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Authentication failed. Please login again."
    });
  }
};

// Optional JWT Authentication Middleware
export const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SEC || "secret_key");
    if (!decoded) {
      return next();
    }

    // Attach basic decoded user info to the request
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    // Gracefully proceed as guest if token is invalid or expired
    next();
  }
};


// Generate Access Token (short-lived for production security)
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.JWT_SEC || "secret_key",
    { expiresIn: "1h" } // 1 hour token expiration
  );
};

// Generate Refresh Token (stored in HttpOnly cookies)
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SEC || "refresh_secret_key",
    { expiresIn: "7d" } // 7 days expiration
  );
};

// Hash password utility
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password utility
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};
