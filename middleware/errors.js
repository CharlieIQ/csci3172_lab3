// Error type that carries an HTTP status code to the error handler
class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

// Catches requests
function notFound(req, res, next) {
    next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler
function errorHandler(err, req, res, next) {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Request body is not valid JSON' });
    }

    const status = err.status || 500;

    if (status >= 500) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }

    const body = { error: err.message };
    if (err.details) body.details = err.details;
    res.status(status).json(body);
}

module.exports = { HttpError, notFound, errorHandler };