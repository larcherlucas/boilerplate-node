function validate(schema, source) {
    return (req, res, next) => {
      const { error } = schema.validate(req[source]);
      if (error) {
        // return next(new ApiError(400, error.name, error.message));
        return res.status(400).json({
          message: 'Validation error',
          details: error.details.map((detail) => detail.message),
        });
      }
      next();
    };
  }
  export default validate;