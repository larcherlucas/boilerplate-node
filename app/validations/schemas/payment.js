import Joi from 'joi';

// Payment status and type enums
const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const PAYMENT_TYPE = {
  SUBSCRIPTION: 'subscription',
  ONE_TIME: 'one_time'
};

// Schema for creating/updating subscription
const paymentSchema = Joi.object({
  priceId: Joi.string().required().messages({
    'string.empty': 'Le price ID Stripe est requis',
    'any.required': 'Le price ID Stripe est requis'
  }),
  customerId: Joi.string().allow(null, ''),
  couponCode: Joi.string().allow(null, '')
}).required();

// Create payment record schema (pour usage interne)
const createPaymentRecordSchema = Joi.object({
  user_id: Joi.number().integer().required(),
  stripe_payment_id: Joi.string().required(),
  stripe_invoice_id: Joi.string().allow(null, ''),
  amount: Joi.number().integer().min(0).required(),
  currency: Joi.string().length(3).default('EUR'),
  status: Joi.string().valid(...Object.values(PAYMENT_STATUS)).required(),
  payment_method: Joi.string().max(50).allow(null, ''),
  payment_type: Joi.string().valid(...Object.values(PAYMENT_TYPE)).required(),
  metadata: Joi.object().default({})
}).required();

// Update payment schema (pour usage interne)
const updatePaymentSchema = Joi.object({
  status: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
  stripe_invoice_id: Joi.string().allow(null, ''),
  metadata: Joi.object()
}).min(1);

// Payment history query schema
const paymentHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0)
});

// Validation function
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map((detail) => detail.message)
      });
    }
    
    // Assigner les valeurs validées à req[source]
    req[source] = value;
    next();
  };
};

export {
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  paymentSchema,
  createPaymentRecordSchema,
  updatePaymentSchema,
  paymentHistoryQuerySchema,
  validate
};