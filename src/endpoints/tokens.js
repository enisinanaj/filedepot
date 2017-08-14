const express = require('express');
const router = express.Router();
const models = require('../models');
const stringIdGenerator = require("../libraries/stringIdGenerator");
const moment = require("moment");
const bcrypt = require('bcryptjs');
const errorResponse = require('../libraries/error-res');
const NotFoundErrror = require('../libraries/notFoundError');

module.exports = router;

router.post('/', require('../middlewares/keyAuth'), (req, res, next) => {
  let clientUserAgent = req.body.userAgent;
  let clientIpAddress = req.body.ipAddress;

  var state = {};

  let createTokenPromise = (id, t) => {
    return models.Token
      .create(
        {
          tokenId: id,
          KeyKeyId: req.key.keyId,
          identitySignature: state.hash,
          dateExpiry: moment().add(2, 'minutes')
        },
        {
          transaction: t,
          logging: null
        }
      );
  };

  let content = clientUserAgent + '&&' + clientIpAddress;
  let salt = bcrypt.genSaltSync(10);
  let hash = bcrypt.hashSync(content, salt);
  state.hash = hash;
  stringIdGenerator('Token', 'tokenId', createTokenPromise)
    .then((token) => {
      let jwtContent = jwt.sign(
        {
          tokenId: token.tokenId
        },
        process.env.API_AUTH_SECRET,
        {
          "expiresIn": '2m'
        }
      );
      return res
        .json({
          "status": "ok",
          "result": jwtContent
        });
    })
    .catch(errorResponse(res));
});
