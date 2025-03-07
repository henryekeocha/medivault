import prisma from './prisma';

interface LogEntry {
  action: string;
  userId: string;
  resourceId?: string;
  details: string;
}

export const hipaaLogger = {
  async log(entry: LogEntry) {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        details: {
          resourceId: entry.resourceId,
          description: entry.details
        },
        timestamp: new Date(), 
      },
    });
  },
}; 