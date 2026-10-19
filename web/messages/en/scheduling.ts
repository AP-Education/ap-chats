import type { Translation } from '../translation';
import type { scheduling as source } from '../uk/scheduling';

export const scheduling = {
  extension: {
    label: 'Schedule message',
    noAttachments: 'Files can’t be scheduled yet',
    immediateOnly: 'This request can only be sent right away',
  },
  scheduleMessage: 'Schedule message',
  schedule: 'Schedule',
  listTitle: 'Scheduled messages',
  changeTime: 'Change time',
  sendNow: 'Send now',
  failedToSendAt: 'Couldn’t send {{when}}',
  arrivesAt: 'Will be sent {{when}}',
  pickPrompt: 'Pick a time that hasn’t passed yet, within a year',
  quickPicks: 'Quick picks',
  time: 'Time',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  quickTimes: {
    inAnHour: 'In an hour',
    todayEvening: 'Today at 6:00 PM',
    tomorrowMorning: 'Tomorrow at 9:00 AM',
    mondayMorning: 'Monday at 9:00 AM',
  },
  sendTime: {
    today: 'today at {{clock}}',
    tomorrow: 'tomorrow at {{clock}}',
    onDate: '{{date}} at {{clock}}',
  },
  errors: {
    schedule: 'Couldn’t schedule the message.',
    reschedule: 'Couldn’t change the time.',
    sendNow: 'Couldn’t send the message.',
    cancel: 'Couldn’t cancel the message.',
  },
} satisfies Translation<typeof source>;
