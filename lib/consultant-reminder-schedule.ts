const KUALA_LUMPUR_TIME_ZONE = "Asia/Kuala_Lumpur";
const KUALA_LUMPUR_UTC_OFFSET_HOURS = 8;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

type KualaLumpurParts = {
  year: number;
  month: string;
  monthIndex: number;
  day: string;
  dayNumber: number;
  hour: number;
};

export type ConsultantReminderSchedule = {
  createdBeforeUtcIso: string;
  localDateKey: string;
  shouldSendNow: boolean;
  startOfLocalDayUtcIso: string;
};

export function buildConsultantReminderSchedule(
  now: Date
): ConsultantReminderSchedule {
  const parts = getKualaLumpurParts(now);

  return {
    createdBeforeUtcIso: new Date(now.getTime() - ONE_DAY_IN_MS).toISOString(),
    localDateKey: `${parts.year}-${parts.month}-${parts.day}`,
    shouldSendNow: parts.hour === 9,
    startOfLocalDayUtcIso: new Date(
      Date.UTC(
        parts.year,
        parts.monthIndex,
        parts.dayNumber,
        -KUALA_LUMPUR_UTC_OFFSET_HOURS
      )
    ).toISOString(),
  };
}

export function wasSentOnKualaLumpurDate(
  sentAt: string | null,
  localDateKey: string
): boolean {
  if (!sentAt) {
    return false;
  }

  const parts = getKualaLumpurParts(new Date(sentAt));
  const sentDateKey = `${parts.year}-${parts.month}-${parts.day}`;

  return sentDateKey === localDateKey;
}

function getKualaLumpurParts(date: Date): KualaLumpurParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KUALA_LUMPUR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: Number(getPart(parts, "year")),
    month: getPart(parts, "month"),
    monthIndex: Number(getPart(parts, "month")) - 1,
    day: getPart(parts, "day"),
    dayNumber: Number(getPart(parts, "day")),
    hour: Number(getPart(parts, "hour")),
  };
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypesRegistry[keyof Intl.DateTimeFormatPartTypesRegistry]
): string {
  const part = parts.find((entry) => entry.type === type);

  if (!part) {
    throw new Error(`Missing date part: ${type}`);
  }

  return part.value;
}
