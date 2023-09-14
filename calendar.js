import { google } from 'googleapis';
import { promises as fsPromises } from 'fs';
import { convertEventsToEventObject } from './eventObject.js'
const calendar = google.calendar('v3');
const keyPath = './data/key.json';

const { readFile } = fsPromises;

import { writeShift } from './database.js';
import { checkDebug } from './configuration.js';


//const prodCalendarID = 'ebc5c3442f1fb186d270623ad01e83d1e24779081e407146debf93d91973a775@group.calendar.google.com';

const prodCalendarID = 'ebc5c3442f1fb186d270623ad01e83d1e24779081e407146debf93d91973a775@group.calendar.google.com';
const debugCalendarID = '15b5c39a95803524c10341710e207fd7694ab12ef861f4d8ef9b205188a4180a@group.calendar.google.com';

function getCalendarID() {

  if (checkDebug()) {
    return debugCalendarID
  } else {
    return prodCalendarID
  }

}

async function authorize() {
  try {
    const data = await readFile(keyPath);
    const key = JSON.parse(data);

    const jwtClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const tokens = await jwtClient.authorize();
    return jwtClient;
  } catch (err) {
    console.error(`Error reading file: ${err}`);
    throw err;
  }
}

 export async function listEvents(startDate, endDate) {
  try {
    const jwtClient = await authorize();
    const res = await calendar.events.list({
      auth: jwtClient,
      calendarId: getCalendarID(),
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 365,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items;

    console.log(`Loaded ${events.length} events from google calendar`)

    if (events.length > 0) {

      const eventArray = events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        return {
          id: event.id,
          name: event.summary,
          startDate: start,
          endDate: end
        };
      });
      
      return convertEventsToEventObject(eventArray);
      
    } else {
      return [];
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}


 export async function createEvent(summary, startDateTime, endDateTime, timeZone) {
  console.log("Create event called!")
  try {
    
    const jwtClient = await authorize();
    const res = await calendar.events.insert({
      auth: jwtClient,
      calendarId: getCalendarID(),
      resource: {
        summary: summary,
        location: 'Krispy Kreme Auburn',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: timeZone,
        },
      },
    });

    console.log(`Event created: ${res.data.htmlLink}`);
    return true
  } catch (err) {
    console.error(err);
    return false
  }

  
}

 export async function deleteEvents(eventIds) {
  try {
    const jwtClient = await authorize();

    for (const eventId of eventIds) {
      await calendar.events.delete({
        auth: jwtClient,
        calendarId: getCalendarID(),
        eventId: eventId
      });

      console.log(`Event ${eventId} deleted`);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
