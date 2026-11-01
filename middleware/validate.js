const { HttpError } = require('./errors');

// This function validates the request body against a schema and returns a middleware function
function validate(schema) {
    return (req, res, next) => {
        const body = req.body;
        // Check if the body is a valid JSON object
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return next(new HttpError(400, 'Request body must be a JSON object'));
        }

        const errors = [];
        // Loop over each field in the schema and validate it against the request body
        for (const [field, rules] of Object.entries(schema)) {
            const value = body[field];

            if (value === undefined || value === null) {
                if (rules.required) errors.push(`${field} is required`);
                continue;
            }
            // Validate the type of the field
            if (rules.type === 'string') {
                if (typeof value !== 'string' || value.trim() === '') {
                    errors.push(`${field} must be a non-empty string`);
                    continue;
                }
                if (rules.oneOf && !rules.oneOf.includes(value.toLowerCase())) {
                    errors.push(`${field} must be one of: ${rules.oneOf.join(', ')}`);
                }
            }
            // Validate number fields
            if (rules.type === 'number') {
                if (typeof value !== 'number' || !Number.isFinite(value)) {
                    errors.push(`${field} must be a valid number`);
                    continue;
                }
                if (rules.integer && !Number.isInteger(value)) {
                    errors.push(`${field} must be a whole number`);
                }
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }
            }
        }

        if (errors.length > 0) {
            return next(new HttpError(400, 'Invalid request body', errors));
        }
        next();
    };
}

module.exports = validate;