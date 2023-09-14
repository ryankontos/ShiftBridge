import { DateTime, Duration } from 'luxon';
import { listEvents, createEvent, deleteEvents } from './calendar.js';
import { handleNotification } from './notify.js';
import { getNewEvents  } from './eventObject.js'
import  { downloadShifts } from './shiftDownloader.js'
import { getShiftsNotInCalendarDatabase, writeShift } from './database.js';
import { checkDebug, setConfig } from './configuration.js';


export const handler = async(event, context) => {
  try {

      setConfig(event)

      const result = await run();
      return result
  }
  catch (e) {
      console.error(e);
      return 500;
  }
};


 export async function run() {
  
    console.log(`Debug: ${checkDebug()}`)

    let originalShifts = await downloadShifts();

    let newShifts = originalShifts

    if (newShifts.length == 0) {
      return;
    }

    (async() => {
      await handleNotification(newShifts);
    })(); 


    newShifts = await getShiftsNotInCalendarDatabase(newShifts)
    console.log(`New events after AWS dif: ${newShifts.length}`)

    if (newShifts.length == 0) {
      console.log("No events after AWS dif, so not doing anything!")
      return newShifts;
    }

    const startDate = await getEarliestDate(newShifts)
    const endDate = DateTime.now().plus({ days: 15 }).toJSDate()

    const calendarEvents = await listEvents(startDate, endDate);
    
    newShifts = await getNewEvents(calendarEvents, newShifts)
    console.log(`New events after Gcal dif: ${newShifts.length}`)

      if (newShifts.length > 0) {

        console.log("Creating new events")
        await createEventsFromObject(newShifts);

      } else {

        console.log("No changes, so not doing anything!")

      }

      console.log("Done!")

      return originalShifts
      
   
}

async function getEarliestDate(data) {
  let earliestDate = new Date(data[0].startDate);
  for (let i = 1; i < data.length; i++) {
    const currentDate = new Date(data[i].startDate);
    if (currentDate < earliestDate) {
      earliestDate = currentDate;
    }
  }
  return earliestDate;
}
  
async function createEventsFromObject(obj) {

  const dateKey = DateTime.now().toMillis().toString()

  const summary = 'Hannah Work';
  const timeZone = DateTime.local().zoneName;

  for (const event of obj) {

    const { startDate, endDate } = event;

    const startDateTime = DateTime.fromMillis(startDate).setZone(timeZone);
    const endDateTime = DateTime.fromMillis(endDate).setZone(timeZone);


      const result = await createEvent(summary, startDateTime.toJSDate(), endDateTime.toJSDate(), timeZone, dateKey);
      if (result) {
        await writeShift(event, "HWScrape_CalendarSavedShifts", dateKey);
      }
    
  }
}

