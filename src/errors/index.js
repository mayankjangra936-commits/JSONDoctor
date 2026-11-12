export class JsonDoctorError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'JSONDOCTOR_ERROR';
    if (options.details !== undefined) {
      this.details = options.details;
    }
  }
}

export class InvalidJsonError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'INVALID_JSON', ...options });
    this.line = options.line ?? null;
    this.column = options.column ?? null;
    this.position = options.position ?? null;
  }
}

export class InvalidInputTypeError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'INVALID_INPUT_TYPE', ...options });
  }
}

export class InvalidPathError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'INVALID_PATH', ...options });
  }
}

export class InvalidSchemaError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'INVALID_SCHEMA', ...options });
  }
}

export class UnsupportedRepairError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'UNSUPPORTED_REPAIR', ...options });
  }
}

export class MaxDepthExceededError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'MAX_DEPTH_EXCEEDED', ...options });
  }
}

export class TransformationConflictError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'TRANSFORMATION_CONFLICT', ...options });
  }
}

export class FileOperationError extends JsonDoctorError {
  constructor(message, options = {}) {
    super(message, { code: 'FILE_OPERATION', ...options });
  }
}
