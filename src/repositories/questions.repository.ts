import { prisma } from '../prisma/client';
import { Prisma } from '../../prisma/generated/prisma/client';

export const createQuestion = async (
  data: Prisma.QuestionCreateInput | Prisma.QuestionUncheckedCreateInput,
) => {
  const question = await prisma.question.create({
    data,
  });
  return question;
};

export const updateQuestion = async (
  id: string,
  data: Prisma.QuestionUpdateInput,
) => {
  const question = await prisma.question.update({
    where: { id },
    data,
  });
  return question;
};

export const getQuestion = async (id: string) => {
  const question = await prisma.question.findUnique({
    where: { id },
  });
  return question;
};

/**
 * Find question by input data (chart + demographics + date)
 * Returns most recent question matching the criteria (any status)
 */
export const findQuestionByInput = async (
  inputData: {
    scope: 'me' | 'daily';
    birthDateTime: string; // ISO string
    gender: 'male' | 'female';
    birthTimezone: string;
    isTimeKnown: boolean;
    ageRange: string;
    date?: string; // YYYY-MM-DD format (only for daily scope)
  },
) => {
  const questions = await prisma.question.findMany({
    where: {
      type: inputData.scope === 'me' ? 'personal' : 'daily',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Match by all input fields
  for (const question of questions) {
    const input = question.input as any;
    if (
      input?.scope === inputData.scope &&
      input?.birthDateTime === inputData.birthDateTime &&
      input?.gender === inputData.gender &&
      input?.birthTimezone === inputData.birthTimezone &&
      input?.isTimeKnown === inputData.isTimeKnown &&
      input?.ageRange === inputData.ageRange &&
      input?.date === inputData.date // undefined matches undefined
    ) {
      return question;
    }
  }

  return null;
};

/**
 * Find most recent completed question for the same chart (even if expired)
 * Used to show previous questions while generating new ones
 * Matches by chart identity (birthDateTime, gender, birthTimezone, isTimeKnown) and scope
 * Ignores ageRange and date so we can show previous questions even if user aged or date changed
 */
export const findLastCompletedQuestionByInput = async (
  inputData: {
    scope: 'me' | 'daily';
    birthDateTime: string;
    gender: 'male' | 'female';
    birthTimezone: string;
    isTimeKnown: boolean;
    ageRange: string;
    date?: string;
  },
) => {
  const questions = await prisma.question.findMany({
    where: {
      type: inputData.scope === 'me' ? 'personal' : 'daily',
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Match by chart identity (same person) and scope, ignore ageRange and date
  // This allows showing previous questions even if user aged or date changed
  for (const question of questions) {
    const input = question.input as any;
    if (
      input?.scope === inputData.scope &&
      input?.birthDateTime === inputData.birthDateTime &&
      input?.gender === inputData.gender &&
      input?.birthTimezone === inputData.birthTimezone &&
      input?.isTimeKnown === inputData.isTimeKnown
      // Note: We intentionally ignore ageRange and date to show previous questions
    ) {
      return question;
    }
  }

  return null;
};
