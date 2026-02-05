import { prisma } from '../prisma/client';
import { Prisma } from '../../prisma/generated/prisma/client';

export const createReport = async (
  data: Prisma.ReportCreateInput | Prisma.ReportUncheckedCreateInput,
) => {
  const report = await prisma.report.create({
    data,
  });
  return report;
};

export const updateReport = async (
  id: string,
  data: Prisma.ReportUpdateInput,
) => {
  const report = await prisma.report.update({
    where: { id },
    data,
  });
  return report;
};

export const getReport = async (id: string) => {
  const report = await prisma.report.findUnique({
    where: { id },
  });
  return report;
};

export const findByCode = async (code: string) => {
  const report = await prisma.report.findUnique({
    where: { code },
  });
  return report;
};

export const findPersonalReportByUserIdAndInput = async (
  userId: string,
  inputData: any,
) => {
  // Find most recent completed personal report with matching input
  const reports = await prisma.report.findMany({
    where: {
      userId,
      type: 'personal',
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if any report has matching input data
  for (const report of reports) {
    const reportInput = report.input as any;
    if (
      reportInput.birthDateTime === inputData.birthDateTime &&
      reportInput.gender === inputData.gender &&
      reportInput.birthTimezone === inputData.birthTimezone &&
      reportInput.isTimeKnown === inputData.isTimeKnown
    ) {
      return report;
    }
  }

  return null;
};

export const findForecastReportByUserIdAndDate = async (
  userId: string,
  targetDate: string, // YYYY-MM-DD format
) => {
  // Find most recent forecast report for this user and date (any status)
  // Prisma JSON filtering: check if input.targetDate matches
  const reports = await prisma.report.findMany({
    where: {
      userId,
      type: 'forecast',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Filter by targetDate in input JSON
  for (const report of reports) {
    const input = report.input as any;
    if (input?.targetDate === targetDate) {
      return report;
    }
  }

  return null;
};

export const findForecastReportByCodeAndDate = async (
  userCode: string,
  targetDate: string, // YYYY-MM-DD format
) => {
  // First find user by code, then find report
  const { prisma: prismaClient } = await import('../prisma/client');
  const user = await prismaClient.user.findUnique({
    where: { code: userCode },
  });

  if (!user) {
    return null;
  }

  return findForecastReportByUserIdAndDate(user.id, targetDate);
};

export const find14DayForecastReportByUserId = async (userId: string) => {
  // Find most recent 14-day forecast report for this user (any status)
  const report = await prisma.report.findFirst({
    where: {
      userId,
      type: 'forecast_14day',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return report;
};

export const findCompatibilityReportByInput = async (inputData: {
  person1: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  person2: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  isTeaser?: boolean;
}) => {
  // Find most recent completed compatibility report with matching input
  // Compare both person1 and person2 data to handle cases where user data changes
  const reports = await prisma.report.findMany({
    where: {
      type: 'compatibility',
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if any report has matching input data (both persons must match)
  for (const report of reports) {
    const reportInput = report.input as any;
    if (!reportInput.person1 || !reportInput.person2) {
      continue;
    }

    // Compare person1 data
    const person1Matches =
      reportInput.person1.code === inputData.person1.code &&
      reportInput.person1.birthDateTime === inputData.person1.birthDateTime &&
      reportInput.person1.gender === inputData.person1.gender &&
      reportInput.person1.birthLocation === inputData.person1.birthLocation &&
      reportInput.person1.birthTimezone === inputData.person1.birthTimezone &&
      reportInput.person1.currentLocation === inputData.person1.currentLocation &&
      reportInput.person1.currentTimezone === inputData.person1.currentTimezone &&
      reportInput.person1.isTimeKnown === inputData.person1.isTimeKnown;

    // Compare person2 data
    const person2Matches =
      reportInput.person2.code === inputData.person2.code &&
      reportInput.person2.birthDateTime === inputData.person2.birthDateTime &&
      reportInput.person2.gender === inputData.person2.gender &&
      reportInput.person2.birthLocation === inputData.person2.birthLocation &&
      reportInput.person2.birthTimezone === inputData.person2.birthTimezone &&
      reportInput.person2.currentLocation === inputData.person2.currentLocation &&
      reportInput.person2.currentTimezone === inputData.person2.currentTimezone &&
      reportInput.person2.isTimeKnown === inputData.person2.isTimeKnown;

    // Also check isTeaser if provided
    const teaserMatches =
      inputData.isTeaser === undefined ||
      reportInput.isTeaser === inputData.isTeaser;

    if (person1Matches && person2Matches && teaserMatches) {
      return report;
    }
  }

  return null;
};

export const findCompatibilityReportByReversedInput = async (inputData: {
  person1: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  person2: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  isTeaser?: boolean;
}) => {
  // Find compatibility report with REVERSED person order
  // Person1 in input = Person2 in report, Person2 in input = Person1 in report
  const reports = await prisma.report.findMany({
    where: {
      type: 'compatibility',
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if any report has reversed matching input data
  for (const report of reports) {
    const reportInput = report.input as any;
    if (!reportInput.person1 || !reportInput.person2) {
      continue;
    }

    // Compare: input.person1 should match report.person2 (reversed)
    const person1MatchesReversed =
      reportInput.person2.code === inputData.person1.code &&
      reportInput.person2.birthDateTime === inputData.person1.birthDateTime &&
      reportInput.person2.gender === inputData.person1.gender &&
      reportInput.person2.birthLocation === inputData.person1.birthLocation &&
      reportInput.person2.birthTimezone === inputData.person1.birthTimezone &&
      reportInput.person2.currentLocation === inputData.person1.currentLocation &&
      reportInput.person2.currentTimezone === inputData.person1.currentTimezone &&
      reportInput.person2.isTimeKnown === inputData.person1.isTimeKnown;

    // Compare: input.person2 should match report.person1 (reversed)
    const person2MatchesReversed =
      reportInput.person1.code === inputData.person2.code &&
      reportInput.person1.birthDateTime === inputData.person2.birthDateTime &&
      reportInput.person1.gender === inputData.person2.gender &&
      reportInput.person1.birthLocation === inputData.person2.birthLocation &&
      reportInput.person1.birthTimezone === inputData.person2.birthTimezone &&
      reportInput.person1.currentLocation === inputData.person2.currentLocation &&
      reportInput.person1.currentTimezone === inputData.person2.currentTimezone &&
      reportInput.person1.isTimeKnown === inputData.person2.isTimeKnown;

    // Also check isTeaser if provided
    const teaserMatches =
      inputData.isTeaser === undefined ||
      reportInput.isTeaser === inputData.isTeaser;

    if (person1MatchesReversed && person2MatchesReversed && teaserMatches) {
      return report;
    }
  }

  return null;
};

export const findCompatibilityReportByInputAnyStatus = async (inputData: {
  person1: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  person2: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  isTeaser?: boolean;
}) => {
  // Find most recent compatibility report with matching input (any status)
  // Compare both person1 and person2 data to handle cases where user data changes
  const reports = await prisma.report.findMany({
    where: {
      type: 'compatibility',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if any report has matching input data (both persons must match)
  for (const report of reports) {
    const reportInput = report.input as any;
    if (!reportInput.person1 || !reportInput.person2) {
      continue;
    }

    // Compare person1 data
    const person1Matches =
      reportInput.person1.code === inputData.person1.code &&
      reportInput.person1.birthDateTime === inputData.person1.birthDateTime &&
      reportInput.person1.gender === inputData.person1.gender &&
      reportInput.person1.birthLocation === inputData.person1.birthLocation &&
      reportInput.person1.birthTimezone === inputData.person1.birthTimezone &&
      reportInput.person1.currentLocation === inputData.person1.currentLocation &&
      reportInput.person1.currentTimezone === inputData.person1.currentTimezone &&
      reportInput.person1.isTimeKnown === inputData.person1.isTimeKnown;

    // Compare person2 data
    const person2Matches =
      reportInput.person2.code === inputData.person2.code &&
      reportInput.person2.birthDateTime === inputData.person2.birthDateTime &&
      reportInput.person2.gender === inputData.person2.gender &&
      reportInput.person2.birthLocation === inputData.person2.birthLocation &&
      reportInput.person2.birthTimezone === inputData.person2.birthTimezone &&
      reportInput.person2.currentLocation === inputData.person2.currentLocation &&
      reportInput.person2.currentTimezone === inputData.person2.currentTimezone &&
      reportInput.person2.isTimeKnown === inputData.person2.isTimeKnown;

    // Also check isTeaser if provided
    const teaserMatches =
      inputData.isTeaser === undefined ||
      reportInput.isTeaser === inputData.isTeaser;

    if (person1Matches && person2Matches && teaserMatches) {
      return report;
    }
  }

  return null;
};

export const findCompatibilityReportByReversedInputAnyStatus = async (inputData: {
  person1: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  person2: {
    code: string;
    birthDateTime: string;
    gender: string;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  };
  isTeaser?: boolean;
}) => {
  // Find compatibility report with REVERSED person order (any status)
  // Person1 in input = Person2 in report, Person2 in input = Person1 in report
  const reports = await prisma.report.findMany({
    where: {
      type: 'compatibility',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if any report has reversed matching input data
  for (const report of reports) {
    const reportInput = report.input as any;
    if (!reportInput.person1 || !reportInput.person2) {
      continue;
    }

    // Compare: input.person1 should match report.person2 (reversed)
    const person1MatchesReversed =
      reportInput.person2.code === inputData.person1.code &&
      reportInput.person2.birthDateTime === inputData.person1.birthDateTime &&
      reportInput.person2.gender === inputData.person1.gender &&
      reportInput.person2.birthLocation === inputData.person1.birthLocation &&
      reportInput.person2.birthTimezone === inputData.person1.birthTimezone &&
      reportInput.person2.currentLocation === inputData.person1.currentLocation &&
      reportInput.person2.currentTimezone === inputData.person1.currentTimezone &&
      reportInput.person2.isTimeKnown === inputData.person1.isTimeKnown;

    // Compare: input.person2 should match report.person1 (reversed)
    const person2MatchesReversed =
      reportInput.person1.code === inputData.person2.code &&
      reportInput.person1.birthDateTime === inputData.person2.birthDateTime &&
      reportInput.person1.gender === inputData.person2.gender &&
      reportInput.person1.birthLocation === inputData.person2.birthLocation &&
      reportInput.person1.birthTimezone === inputData.person2.birthTimezone &&
      reportInput.person1.currentLocation === inputData.person2.currentLocation &&
      reportInput.person1.currentTimezone === inputData.person2.currentTimezone &&
      reportInput.person1.isTimeKnown === inputData.person2.isTimeKnown;

    // Also check isTeaser if provided
    const teaserMatches =
      inputData.isTeaser === undefined ||
      reportInput.isTeaser === inputData.isTeaser;

    if (person1MatchesReversed && person2MatchesReversed && teaserMatches) {
      return report;
    }
  }

  return null;
};