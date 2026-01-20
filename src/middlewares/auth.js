
import jwt from 'jsonwebtoken'

export const auth = (roles = []) => {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header) return res.sendStatus(401)

    const token = header.split(' ')[1]

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (roles.length && !roles.includes(decoded.rol))
        return res.sendStatus(403)

      req.user = decoded
      next()
    } catch {
      res.sendStatus(401)
    }
  }
}
