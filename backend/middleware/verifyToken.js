const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
 console.log("Headers received:", req.headers) 
  const authHeader = req.headers.authorization
 console.log("Authorization header:", authHeader)
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }

}

module.exports = verifyToken