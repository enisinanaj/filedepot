const Promise = require('bluebird');
const jwt = Promise.promisifyAll(require('jsonwebtoken'));
const models = require('filedepot-models');
const authFailed = require('../libraries/auth-failed-res');
const sha256 = require('../libraries/sha256');

/*
  This middleware checks for authorization by access token without deleting the token
  for preflight requests by browsers.
 */
module.exports = (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers.authorization;
  if (!token) {
    return authFailed(res);
  }

  return jwt.verifyAsync(token, process.env.API_AUTH_SECRET)
    .then((decoded) => {
      return models.Token
        .findOne({
          where: {
            tokenId: decoded.tokenId
          },
          include: [
            {
              model: models.Key
            }
          ],
          logging: false
        });
    })
    .then((accessToken) => {
      if (!accessToken) {
        throw new Error('Invalid token');
      }

      let content = process.env.API_AUTH_SECRET + '&&' + req.headers['user-agent'] + '&&' + req.ip;
      if (sha256(content) !== accessToken.identitySignature) {
        throw new Error('Signature is mismatched');
      }

      if (new Date() - accessToken.dateExpiry > 0) {
        throw new Error('Token has expired');
      }

      let reqMethod = req.headers['access-control-request-method'].toLowerCase();
      let approvedMethod = accessToken.method.toLowerCase();
      if (reqMethod !== approvedMethod) {
        throw new Error('Method not allowed');
      }

      req.token = accessToken;
      req.key = accessToken.Key;
      next();
      return null;
    })
    .catch(() => {
      return authFailed(res);
    });
};
