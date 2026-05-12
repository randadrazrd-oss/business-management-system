import config from '../config.js';

/**
 * Parse attendance record from ZKTeco ADMS format
 * Format: UserID\tDateTime\tStatus\tVerification\tWorkCode
 */
export function parseAttendanceRecord(rawLine) {
  const parts = rawLine.trim().split('\t');

  if (parts.length < 4) {
    throw new Error(`Invalid record format: ${rawLine}`);
  }

  const [userId, dateTimeStr, statusCode, verificationCode, workCode = ''] =
    parts;

  // Parse datetime
  let dateTime;
  try {
    // ZKTeco typically sends: YYYY-MM-DD HH:MM:SS
    dateTime = new Date(dateTimeStr);
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid datetime: ${dateTimeStr}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to parse datetime "${dateTimeStr}": ${error.message}`,
    );
  }

  return {
    userId: userId.trim(),
    rawDateTime: dateTimeStr.trim(),
    dateTime,
    status: statusCode.trim(),
    statusLabel: config.statusMap[statusCode.trim()] || 'Unknown',
    verification: verificationCode.trim(),
    verificationLabel:
      config.verificationMap[verificationCode.trim()] || 'Unknown',
    workCode: workCode.trim(),
  };
}

/**
 * Parse multiple records from batch response
 */
export function parseAttendanceBatch(rawData) {
  const lines = rawData.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  return lines
    .map((line) => {
      try {
        return parseAttendanceRecord(line);
      } catch (error) {
        console.warn(`⚠ Skipping invalid record: ${error.message}`);
        return null;
      }
    })
    .filter((record) => record !== null);
}

export default { parseAttendanceRecord, parseAttendanceBatch };
