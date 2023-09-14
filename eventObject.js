import { DateTime } from 'luxon';

export function compareEventObjects(oldEvents, newEvents) {
  const currentTime = new Date().getTime();

  const oldFiltered = oldEvents.filter(event => event.startDate > currentTime);
  const newFiltered = newEvents.filter(event => event.startDate > currentTime);

  const removedEvents = oldFiltered.filter(
    oldEvent => !newFiltered.some(newEvent => newEvent.startDate === oldEvent.startDate && newEvent.endDate === oldEvent.endDate)
  );

  const addedEvents = newFiltered.filter(
    newEvent => !oldFiltered.some(oldEvent => newEvent.startDate === oldEvent.startDate && newEvent.endDate === oldEvent.endDate)
  );

  console.log('Removed events:', removedEvents);
  console.log('Added events:', addedEvents);

  if (removedEvents.length === 0 && addedEvents.length === 0) {
    return 0;
  } else if (removedEvents.length === 0) {
    return 1;
  } else {
    return 2;
  }
}




  export function convertEventsToEventObject(events) {
    const result = [];
    const now = DateTime.local().setZone('local');
  
    events.forEach((event) => {
      if (
        event.name === 'Hannah Work' &&
        DateTime.fromISO(event.startDate).setZone('local') > now
      ) {
        const startDate = DateTime.fromISO(event.startDate).setZone('local').toMillis();
        const endDate = DateTime.fromISO(event.endDate).setZone('local').toMillis();
        
        result.push({
          startDate: startDate,
          endDate: endDate
        });
      }
    });
  
    return result;
  }

  export async function getNewEvents(existingEvents, newEvents) {
    const result = [];
  
    for (const newEvent of newEvents) {
      let exists = false;
  
      for (const existingEvent of existingEvents) {
        if (newEvent.startDate === existingEvent.startDate && newEvent.endDate === existingEvent.endDate) {
          exists = true;
          break;
        }
      }
  
      if (!exists) {
        result.push(newEvent);
      }
    }
  
    return result;
  }