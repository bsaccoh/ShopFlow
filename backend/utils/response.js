/**
 * Standard API Response Utilities
 */

const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        error
    });
};

const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
    return sendResponse(res, statusCode, true, message, data, null);
};

const sendError = (res, message = 'An error occurred', error = null, statusCode = 500) => {
    // Don't expose internal stack traces in production
    const errorDetails = process.env.NODE_ENV === 'production' && statusCode === 500
        ? null
        : error;

    return sendResponse(res, statusCode, false, message, null, errorDetails);
};

module.exports = {
    sendResponse,
    sendSuccess,
    sendError
};
