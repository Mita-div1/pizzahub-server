

const { createRemoteJWKSet, jwtVerify } = require("jose");

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, jwks);
    req.user = {
      id: payload.id || payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).send({ message: "Invalid or expired token" });
  }
};

const verifyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };