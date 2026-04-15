const { sendValidationError } = require('../utils/apiResponse');

/**
 * Factory that returns an Express middleware validating req[target] against a Joi schema.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller)
 *   router.get('/players', validate(querySchema, 'query'), controller)
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return sendValidationError(res, details);
    }

    req[target] = value; // replace with sanitised value
    next();
  };
};

module.exports = { validate };
