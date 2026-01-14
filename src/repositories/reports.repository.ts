import { prisma } from '../prisma/client';
import { Prisma } from '../../prisma/generated/prisma/client';

export const createReport = async (data: Prisma.ReportCreateInput) => {
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
