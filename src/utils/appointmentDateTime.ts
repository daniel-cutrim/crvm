import { format, parseISO } from 'date-fns';

export function parseAppointmentDateTime(value: string) {
  return parseISO(value);
}

export function getAppointmentDateKey(value: string) {
  return format(parseAppointmentDateTime(value), 'yyyy-MM-dd');
}

export function getAppointmentHour(value: string) {
  return parseAppointmentDateTime(value).getHours();
}

export function getAppointmentFormValues(value: string) {
  const date = parseAppointmentDateTime(value);

  return {
    date: format(date, 'yyyy-MM-dd'),
    time: format(date, 'HH:mm'),
    dateObject: date,
  };
}

export function buildAppointmentTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
