// controller.wrapper.js
const controllerWrapper = (controllerFn) => async (req, res, next) => {
  try {
    await controllerFn(req, res, next);
  } catch (err) {
    console.error('Controller error:', err);
    
    // Handle different types of errors
    if (err.name === 'DatabaseError') {
      return res.status(500).json({
        status: 'error',
        message: 'Database error occurred',
        error: err.message
      });
    }
    
    if (err.name === 'ApiError') {
      return res.status(err.status || 500).json({
        status: 'error',
        message: err.message
      });
    }
    
    // Default error response
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
};

export default controllerWrapper;