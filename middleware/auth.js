
let joseLib;
let jwks;

async function getJose() {
  if (!joseLib) joseLib = await import("jose");
  if (!jwks) {
    jwks = joseLib.createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    );
  }
  return { jwtVerify: joseLib.jwtVerify, jwks };
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { jwtVerify, jwks } = await getJose();
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