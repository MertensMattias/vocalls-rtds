// ============================================================================
// LOGGER
// ============================================================================
Logger = {
    config: {
        enabled: true,
        activeLevel: "DEBUG",  // DEBUG, INFO, WARN, ERROR
        timeout: 10000,
        maxBodySize: 10000,
        apiBaseUrl: "https://api.n-allo.be",
        apiPath: "/api/EventLog",
        defaultEnvironment: "prd",
        logAllApiCalls: true,
        buildApiUrl: function (env) {
            return this.apiBaseUrl + "/ivrapi-" + (env || this.defaultEnvironment) + this.apiPath;
        }
    },

    resolvedPromise: function (value) {
        return {
            then: function (success) {
                return success(value);
            }
        };
    },

    shouldLog: function (severity) {
        var levels = ["DEBUG", "INFO", "WARN", "ERROR"];
        var activeIndex = levels.indexOf(this.config.activeLevel);
        var requestIndex = levels.indexOf(severity);
        if (activeIndex === -1) {
            activeIndex = 1;
        }
        return requestIndex >= activeIndex;
    },

    // FIX: parseInt absorbs string status codes; numeric range check is unambiguous
    isSuccessStatus: function (status) {
        var numericStatus = parseInt(status, 10);
        if (isNaN(numericStatus)) return false;
        return numericStatus >= 200 && numericStatus < 300;
    },

    sanitizeForLog: function (obj, maxSize) {
        maxSize = maxSize || this.config.maxBodySize;
        if (obj === null) return "null";
        if (typeof obj === "undefined") return "undefined";
        try {
            var replacer = function (key, value) {
                if (typeof value === "function") {
                    return "[Function: " + (value.name || "anonymous") + "]";
                }
                return value;
            };
            var json = JSON.stringify(obj, replacer);
            if (!json || json === "null") return "{}";
            var truncMarker = "... (truncated)";
            var truncMarkerLen = truncMarker.length;
            if (maxSize <= truncMarkerLen) {
                return "{}";
            }
            var maxContentSize = maxSize - truncMarkerLen;
            if (json.length > maxSize) {
                return json.substring(0, maxContentSize) + truncMarker;
            }
            return json;
        } catch (e) {
            return "[Unserializable: " + e.message + "]";
        }
    },

    extractStack: function (err) {
        if (!err || !err.stack) return null;
        try {
            var lines = err.stack.split("\n").slice(0, 10);
            var trace = lines.join("\n");
            if (trace.length > 3000) {
                return trace.substring(0, 3000) + "...";
            }
            return trace;
        } catch (e) {
            return null;
        }
    },

    getTimestamp: function () {
        return new Date().toISOString();
    },

    // FIX: coerce callIdKey/routingId to string before posting
    getCallIdKey: function () {
        var vo = (typeof varObj !== "undefined") ? varObj : null;
        if (vo && vo.callIdKey) return String(vo.callIdKey);
        if (vo && vo.CallIdKey) return String(vo.CallIdKey);
        if (typeof callIdKey !== "undefined" && callIdKey) return String(callIdKey);
        if (typeof _callIdKey !== "undefined" && _callIdKey) return String(_callIdKey);
        return null;
    },

    getRoutingId: function () {
        var vo = (typeof varObj !== "undefined") ? varObj : null;
        if (vo && vo.routingId) return String(vo.routingId);
        if (vo && vo.RoutingId) return String(vo.RoutingId);
        if (typeof routingId !== "undefined" && routingId) return String(routingId);
        if (typeof _routingId !== "undefined" && _routingId) return String(_routingId);
        return null;
    },

    categorizeError: function (error, context) {
        var category = {
            type: "UNKNOWN",
            source: "APPLICATION",
            severity: "ERROR"
        };
        if (context && context.errorCategory) {
            category.type = context.errorCategory;
        }
        if (context && context.errorSource) {
            category.source = context.errorSource;
        }
        var status = context && context.status;
        if (status && typeof status === "number") {
            var statusMap = {
                408: { type: "TIMEOUT", source: "NETWORK" },
                504: { type: "TIMEOUT", source: "NETWORK" },
                503: { type: "SERVICE_UNAVAILABLE", source: "API" },
                429: { type: "RATE_LIMIT", source: "API" },
                404: { type: "NOT_FOUND", source: "REQUEST" },
                401: { type: "AUTH_ERROR", source: "REQUEST" },
                403: { type: "AUTH_ERROR", source: "REQUEST" }
            };
            if (!context || !context.errorCategory) {
                if (statusMap[status]) {
                    category.type = statusMap[status].type;
                    category.source = statusMap[status].source;
                } else if (status >= 500) {
                    category.type = "SERVER_ERROR";
                    category.source = "API";
                } else if (status >= 400) {
                    category.type = "CLIENT_ERROR";
                    category.source = "REQUEST";
                }
            }
        }
        if (error && (!status || typeof status !== "number") && (!context || !context.errorCategory)) {
            var errorName = error.name || "";
            var errorMsg = (error.message || "").toLowerCase();
            if (errorName === "TypeError" || errorName === "ReferenceError" || errorName === "SyntaxError") {
                category.type = errorName === "SyntaxError" ? "PARSING_ERROR" : "CODE_ERROR";
                category.source = "APPLICATION";
                category.severity = "CRITICAL";
            } else if (errorName === "TimeoutError" || errorMsg.indexOf("timeout") !== -1) {
                category.type = "TIMEOUT";
                category.source = "NETWORK";
            } else if (errorMsg.indexOf("network") !== -1 || errorMsg.indexOf("connection") !== -1) {
                category.type = "NETWORK_ERROR";
                category.source = "NETWORK";
            }
        }
        return category;
    },

    /**
     * @param {Object} params
     * @param {string} params.eventType - LOGGED | API_ERROR | API_CALL
     * @param {string} params.severity  - DEBUG | INFO | WARN | ERROR
     * @param {string} params.message
     * @param {Object} params.context
     * @param {Error|Object} [params.error]
     * @returns {Object} EventDetail
     */
    buildEventDetail: function (params) {
        var eventType = params.eventType;
        var severity = params.severity;
        var message = params.message;
        if (message === null || typeof message === "undefined") {
            message = "";
        } else {
            message = String(message);
        }
        var context = params.context || {};
        var error = params.error;
        var err = null;
        var stack = null;
        if (error) {
            if (error instanceof Error) {
                err = error;
            } else if (typeof error === "object" && error.message) {
                err = error;
            } else {
                err = new Error(String(error));
            }
        }
        if (severity === "ERROR" && err) {
            stack = this.extractStack(err);
        }
        var extras = {};
        if (error) {
            var errorCategory = this.categorizeError(error, context);
            extras.errorType = errorCategory.type;
            extras.errorSource = errorCategory.source;
            extras.errorSeverity = errorCategory.severity;
            if (error.message) extras.errorMessage = error.message;
            if (error.name) extras.errorName = error.name;
        }
        if (context && typeof context === "object") {
            for (var key in context) {
                if (Object.prototype.hasOwnProperty.call(context, key) &&
                    key !== "endpoint" && key !== "method" &&
                    key !== "status" && key !== "duration") {
                    extras[key] = context[key];
                }
            }
        }
        return {
            eventType: eventType || null,
            severity: severity || null,
            message: message,
            stackTrace: stack,
            segment: (typeof segmentState !== "undefined" && segmentState && segmentState.currentSegment) || null,
            segmentResult: (typeof segmentState !== "undefined" && segmentState && segmentState.segmentResult) || null,
            endpoint: context.endpoint || null,
            method: context.method || null,
            statusCode: typeof context.status === "number" ? context.status : null,
            // FIX: round to int32 as required by API schema
            duration: typeof context.duration === "number" ? Math.round(context.duration) : null,
            extrasJSON: this.sanitizeForLog(extras),
            eventTimestamp: this.getTimestamp(),
            createdBy: ""
        };
    },

    _sendEventsToAPI: function (events, retryAttempt) {
        retryAttempt = retryAttempt || 0;
        var vo = (typeof varObj !== "undefined") ? varObj : null;
        var env = (vo && vo.environment) || (typeof environment !== "undefined" && environment) || this.config.defaultEnvironment;
        var apiUrl = this.config.buildApiUrl(env);
        var requestBody = {
            callIdKey: this.getCallIdKey(),
            routingId: this.getRoutingId(),
            events: events
        };
        var self = this;
        if (this.shouldLog("DEBUG")) {
            log_debug("[Logger] _sendEventsToAPI request | url: " + apiUrl + " | body: " + self.sanitizeForLog(requestBody));
        }
        return jsonHttpRequest(
            apiUrl,
            { method: "POST" },
            _headers,
            requestBody
        ).withTimeout(this.config.timeout).then(
            function (result) {
                return { success: true, error: null, retriesExceeded: false, retryAttempt: retryAttempt, response: result };
            },
            function (error) {
                log_error("[Logger] _sendEventsToAPI error | " + self.sanitizeForLog(error));
                if (retryAttempt < self.config.flushRetryCount) {
                    return self._sendEventsToAPI(events, retryAttempt + 1);
                }
                return { success: false, error: error, retriesExceeded: true, retryAttempt: retryAttempt };
            }
        );
    },

    postEventToAPI: function (eventObj) {
        if (!this.config.enabled) {
            return this.resolvedPromise({ success: true, skipped: true });
        }
        var hasContext = typeof context !== "undefined" && context.session && context.session.variables;
        var effectiveBufferEnabled = this.config.bufferEnabled && hasContext;
        if (!effectiveBufferEnabled) {
            return this._sendEventsToAPI([eventObj], 0);
        }
        var severity = eventObj.severity || "";
        var isError = severity === "ERROR";
        if (isError && this.config.bufferFlushOnError) {
            this.addToBuffer(eventObj);
            return this.flushBuffer();
        }
        this.addToBuffer(eventObj);
        return this.resolvedPromise({ success: true, buffered: true, bufferSize: this.getBufferSize() });
    },

    getBuffer: function () {
        if (typeof context !== "undefined" && context.session && context.session.variables) {
            if (!context.session.variables._loggerBuffer) {
                context.session.variables._loggerBuffer = [];
            }
            return context.session.variables._loggerBuffer;
        }
        return null;
    },

    clearBuffer: function () {
        if (typeof context !== "undefined" && context.session && context.session.variables) {
            context.session.variables._loggerBuffer = [];
        }
    },

    getBufferSize: function () {
        var buffer = this.getBuffer();
        return buffer ? buffer.length : 0;
    },

    addToBuffer: function (eventObj) {
        if (!this.config.bufferEnabled) {
            return false;
        }
        var buffer = this.getBuffer();
        if (!buffer || !Array.isArray(buffer)) {
            return false;
        }
        buffer.push(eventObj);
        if (buffer.length >= this.config.bufferMaxSize) {
            this.flushBuffer();
        }
        return true;
    },

    flushBuffer: function () {
        var buffer = this.getBuffer();
        if (!buffer || buffer.length === 0) {
            return this.resolvedPromise({ success: true, skipped: true, message: "Buffer empty" });
        }
        if (!this.config.enabled) {
            this.clearBuffer();
            return this.resolvedPromise({ success: true, skipped: true, message: "Logger disabled" });
        }
        var eventsToSend = [];
        for (var i = 0; i < buffer.length; i++) {
            eventsToSend.push(buffer[i]);
        }
        this.clearBuffer();
        if (this.config.activeLevel === "DEBUG") {
            this.debug("Logger: Flushing buffer", { bufferSize: eventsToSend.length });
        }
        var self = this;
        return this._sendEventsToAPI(eventsToSend, 0).then(function (result) {
            if (!result.success && result.retriesExceeded && self.config.activeLevel === "DEBUG") {
                self.debug("Logger: Buffer flush failed after all retries", {
                    eventsCount: eventsToSend.length,
                    retryAttempt: result.retryAttempt
                });
            }
            return result;
        });
    },

    /**
     * Debug logging - local only
     * @param {string} message
     * @param {Object} [context]
     */
    debug: function (message, context) {
        context = context || {};
        if (!this.shouldLog("DEBUG")) return;
        var msg = "[Logger:DEBUG] " + message;
        if (context && typeof context === "object" && Object.keys(context).length > 0) {
            msg += " | Context: " + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);
    },

    /**
     * Info logging - local only
     * @param {string} message
     * @param {Object} [context]
     */
    info: function (message, context) {
        context = context || {};
        if (!this.shouldLog("INFO")) return;
        var msg = "[Logger:INFO] " + message;
        if (context && typeof context === "object" && Object.keys(context).length > 0) {
            msg += " | Context: " + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);
    },

    /**
     * Warning logging - local + API
     * @param {string} message
     * @param {Object} [context]
     */
    warn: function (message, context) {
        context = context || {};
        if (!this.shouldLog("WARN")) return;
        var msg = "[Logger:WARN] " + message;
        if (context && typeof context === "object" && Object.keys(context).length > 0) {
            msg += " | Context: " + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);
        this.postEventToAPI(this.buildEventDetail({
            eventType: "LOGGED",
            severity: "WARN",
            message: message,
            context: context
        }));
    },

    /**
     * Error logging - local + API with full error details
     * @param {string} message
     * @param {Object} [context]
     * @param {Error|Object} [errorObj]
     */
    error: function (message, context, errorObj) {
        context = context || {};
        if (!this.shouldLog("ERROR")) return;
        var msg = "[Logger:ERROR] " + message;
        if (errorObj && errorObj.message) {
            msg += " | Error: " + errorObj.message;
        }
        if (context && typeof context === "object" && Object.keys(context).length > 0) {
            msg += " | Context: " + this.sanitizeForLog(context, 300);
        }
        if (errorObj && errorObj.stack) {
            var stack = this.extractStack(errorObj);
            if (stack) {
                msg += " | Stack: " + stack;
            }
        }
        log_error(msg);
        this.postEventToAPI(this.buildEventDetail({
            eventType: "LOGGED",
            severity: "ERROR",
            message: message,
            context: context,
            error: errorObj
        }));
    },

    /**
     * API call logging - determines error vs success from status code
     * @param {string} message
     * @param {Object} context - endpoint, status, duration, etc.
     * @param {Error|Object} [errorObj]
     */
    API: function (message, context, errorObj) {
        context = context || {};
        var status = typeof context.status === "number" ? context.status : null;
        // FIX: only treat as error if errorObj is set or status is present and not 2xx
        // (null status + no errorObj = success, not an error)
        var isError = !!errorObj || (status !== null && !this.isSuccessStatus(status));
        var msg = "[Logger:API" + (isError ? "_ERROR" : "") + "] " + message;
        msg += " | Status: " + (status !== null ? status : "N/A");
        if (context.endpoint) {
            msg += " | Endpoint: " + context.endpoint;
        }
        if (context.duration) {
            msg += " | Duration: " + context.duration + "ms";
        }
        if (errorObj && errorObj.message) {
            msg += " | Error: " + errorObj.message;
        }
        log_debug(msg);
        if (isError) {
            this.postEventToAPI(this.buildEventDetail({
                eventType: "API_ERROR",
                severity: "ERROR",
                message: message,
                context: context,
                error: errorObj
            }));
        } else if (this.config.logAllApiCalls) {
            this.postEventToAPI(this.buildEventDetail({
                eventType: "API_CALL",
                severity: "INFO",
                message: message,
                context: context,
                error: null
            }));
        }
    },

    /**
     * Configure logger at runtime with validation
     * @param {Object} config
     * @example Logger.configure({ activeLevel: "WARN" });
     */
    configure: function (config) {
        if (!config || typeof config !== "object") return;
        var validLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
        var stringKeys = ["apiBaseUrl", "apiPath", "defaultEnvironment"];
        for (var key in config) {
            if (Object.prototype.hasOwnProperty.call(config, key) &&
                Object.prototype.hasOwnProperty.call(this.config, key)) {
                var value = config[key];
                var isValid = true;
                if (key === "activeLevel") {
                    if (validLevels.indexOf(value) === -1) {
                        log_debug("[Logger] Invalid activeLevel: " + value + ", defaulting to INFO");
                        value = "INFO";
                    }
                } else if (key === "bufferMaxSize" || key === "flushRetryCount") {
                    if (typeof value !== "number" || value < 0) {
                        log_debug("[Logger] Invalid number for " + key + ": " + value + ", keeping current: " + this.config[key]);
                        isValid = false;
                    }
                } else if (key === "timeout" || key === "maxBodySize") {
                    if (typeof value !== "number" || value <= 0) {
                        log_debug("[Logger] Invalid number for " + key + ": " + value + ", keeping current: " + this.config[key]);
                        isValid = false;
                    }
                } else if (key === "enabled" || key === "logAllApiCalls" || key === "bufferEnabled" || key === "bufferFlushOnError" || key === "bufferFlushOnCallEnd") {
                    if (typeof value !== "boolean") {
                        log_debug("[Logger] Invalid boolean for " + key + ": " + value + ", keeping current: " + this.config[key]);
                        isValid = false;
                    }
                } else if (stringKeys.indexOf(key) !== -1) {
                    if (typeof value !== "string") {
                        log_debug("[Logger] Invalid string for " + key + ": " + value + ", keeping current: " + this.config[key]);
                        isValid = false;
                    }
                }
                if (isValid) {
                    this.config[key] = value;
                }
            }
        }
        if (this.config.activeLevel === "DEBUG") {
            log_debug("[Logger] Configuration updated: " + this.sanitizeForLog(config));
        }
    }
};