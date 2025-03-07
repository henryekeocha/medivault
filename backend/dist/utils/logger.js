/**
 * System Logger Utility with AWS CloudWatch integration
 *
 * This is for general application/operational logging only.
 * NOT for security events or PHI access which require audit logging.
 *
 * For HIPAA-compliant audit logging of security events, PHI access,
 * or other compliance-required events, use the audit-logger instead.
 */
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';
// Initialize AWS CloudWatch Logs client
const cloudWatchLogsClient = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});
// Log group and stream configuration
const LOG_GROUP_NAME = process.env.AWS_CLOUDWATCH_SYSTEM_LOG_GROUP || '/medical-image-sharing/system-logs';
const LOG_STREAM_NAME = `${process.env.NODE_ENV || 'development'}-${new Date().toISOString().split('T')[0]}`;
// Track sequence token for log stream
let sequenceToken;
// Initialize log group and stream
async function initializeLogging() {
    try {
        // Create log group if it doesn't exist (this operation is idempotent)
        try {
            await cloudWatchLogsClient.send(new CreateLogGroupCommand({
                logGroupName: LOG_GROUP_NAME
            }));
            console.info(`Created CloudWatch log group: ${LOG_GROUP_NAME}`);
        }
        catch (error) {
            // Ignore error if log group already exists
            if (!(error instanceof Error) || !error.message.includes('already exists')) {
                console.warn(`Error creating CloudWatch log group: ${error}`);
            }
        }
        // Create log stream if it doesn't exist
        try {
            await cloudWatchLogsClient.send(new CreateLogStreamCommand({
                logGroupName: LOG_GROUP_NAME,
                logStreamName: LOG_STREAM_NAME
            }));
            console.info(`Created CloudWatch log stream: ${LOG_STREAM_NAME}`);
        }
        catch (error) {
            // Ignore error if log stream already exists
            if (!(error instanceof Error) || !error.message.includes('already exists')) {
                console.warn(`Error creating CloudWatch log stream: ${error}`);
            }
        }
        // Get the sequence token for the log stream
        const logStreams = await cloudWatchLogsClient.send(new DescribeLogStreamsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamNamePrefix: LOG_STREAM_NAME
        }));
        if (logStreams.logStreams && logStreams.logStreams.length > 0) {
            sequenceToken = logStreams.logStreams[0].uploadSequenceToken;
        }
    }
    catch (error) {
        console.error('Failed to initialize CloudWatch logging:', error);
    }
}
// Initialize on startup if in production
if (process.env.NODE_ENV === 'production') {
    initializeLogging().catch(err => console.error('Failed to initialize CloudWatch logging:', err));
}
/**
 * Logger utility class with different log levels for system operations
 * Not to be used for security or PHI events - use audit-logger instead
 */
export const logger = {
    /**
     * Debug level logging - for detailed debugging information
     * Only shown in development environments
     */
    debug: (message, options) => {
        if (process.env.NODE_ENV !== 'production') {
            logMessage('debug', message, options);
        }
    },
    /**
     * Info level logging - for general information about system operation
     */
    info: (message, options) => {
        logMessage('info', message, options);
    },
    /**
     * Warning level logging - for potentially harmful situations
     */
    warn: (message, options) => {
        logMessage('warn', message, options);
    },
    /**
     * Error level logging - for error events that might still allow the
     * application to continue running
     */
    error: (message, error, options) => {
        const meta = options?.meta || {};
        if (error) {
            // Handle both Error objects and other types
            if (error instanceof Error) {
                meta.error = {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                };
            }
            else {
                meta.error = error;
            }
        }
        logMessage('error', message, { ...options, meta });
    }
};
/**
 * Internal function to format and print log messages
 */
function logMessage(level, message, options) {
    const timestamp = options?.timestamp !== false ? new Date().toISOString() : null;
    const meta = options?.meta;
    let logObject = {
        level,
        message,
    };
    if (timestamp) {
        logObject.timestamp = timestamp;
    }
    if (meta) {
        logObject.meta = meta;
    }
    // Always log to console in development
    if (process.env.NODE_ENV !== 'production') {
        switch (level) {
            case 'debug':
                console.debug(JSON.stringify(logObject));
                break;
            case 'info':
                console.info(JSON.stringify(logObject));
                break;
            case 'warn':
                console.warn(JSON.stringify(logObject));
                break;
            case 'error':
                console.error(JSON.stringify(logObject));
                break;
        }
    }
    // In production, send logs to CloudWatch
    if (process.env.NODE_ENV === 'production') {
        sendToCloudWatch(level, logObject)
            .catch(error => console.error('Failed to send log to CloudWatch:', error));
    }
}
/**
 * Sends log messages to AWS CloudWatch
 */
async function sendToCloudWatch(level, logObject) {
    try {
        const logEvent = {
            timestamp: Date.now(),
            message: JSON.stringify(logObject)
        };
        const putLogEventsCommand = new PutLogEventsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamName: LOG_STREAM_NAME,
            logEvents: [logEvent],
            sequenceToken
        });
        const response = await cloudWatchLogsClient.send(putLogEventsCommand);
        sequenceToken = response.nextSequenceToken;
        return response;
    }
    catch (error) {
        // If the sequence token is invalid, try to get a new one and retry
        if (error instanceof Error &&
            (error.message.includes('The specified sequence token is invalid') ||
                error.message.includes('The sequence token is not valid'))) {
            try {
                const logStreams = await cloudWatchLogsClient.send(new DescribeLogStreamsCommand({
                    logGroupName: LOG_GROUP_NAME,
                    logStreamNamePrefix: LOG_STREAM_NAME
                }));
                if (logStreams.logStreams && logStreams.logStreams.length > 0) {
                    sequenceToken = logStreams.logStreams[0].uploadSequenceToken;
                    // Retry with the new sequence token
                    return sendToCloudWatch(level, logObject);
                }
            }
            catch (retryError) {
                console.error('Failed to get sequence token for retry:', retryError);
                throw retryError;
            }
        }
        throw error;
    }
}
//# sourceMappingURL=logger.js.map