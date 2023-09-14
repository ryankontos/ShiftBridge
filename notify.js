
import { compareEventObjects } from "./eventObject.js";
import { DateTime, Interval } from 'luxon';
import axios from 'axios';
import { getShiftsNotInNotifDatabase, matchToNotifDatabase, notifDatabaseWriteShifts, writeShift } from "./database.js";
import { checkDebug } from "./configuration.js";

export async function handleNotification(newObject) {

  const matchingResult = await matchToNotifDatabase(newObject)
  const events = matchingResult[0]
  const changedState = matchingResult[1]

  if (changedState == 0 || events.length < 1) {
    console.log("Not sending notification!")
    return
  }

  const notif = getNotificationContents(events, changedState)

  const dateRanges = getDateRanges(events);

  await notifDatabaseWriteShifts(events)
  await sendNotificationToHowLongLeft(notif[0], notif[1], notif[2], dateRanges)

}


function getNotificationContents(object, compareResult) {

  const shiftsCount = object.length;
    
    const dateArray = object.map(({ startDate, endDate }) => [
      DateTime.fromMillis(startDate).setZone("Australia/Sydney"),
      DateTime.fromMillis(endDate).setZone("Australia/Sydney")
    ]);

    const totalDurString = getTotalDuration(dateArray);

    let title = `${shiftsCount} New Shift${shiftsCount > 1 ? 's' : ''} for Hannah`;

    if (compareResult == 2) {
      let title = `Hannah's Shifts Were Updated`
    }

    
    const subtitle = `Total Duration: ${totalDurString}`
    const body = generateNotificationBody(object)

    return [title, subtitle, body]

}

function generateNotificationBody(object) {

  const localTZ = "Australia/Sydney";
  const formattedDates = [];

  for (const { startDate, endDate } of object) {
    const start = DateTime.fromMillis(startDate).setZone(localTZ);
    const end = DateTime.fromMillis(endDate).setZone(localTZ);
    const formatted = getFormattedDateTimeLengthString(start, end);
    formattedDates.push(formatted);
  }

  return formattedDates.join('\n');

}

 
function getFormattedDateTimeLengthString(startDate, endDate) {

  let durString = getTotalDuration([[startDate, endDate]])
  let startMinutes = startDate.toFormat("mm")
  let endMinutes = endDate.toFormat("mm")

  let formattedDay = ""
  if (startMinutes === "00") {
      formattedDay = startDate.toFormat("EEE, MMM d (ha -")
  } else {
      formattedDay = startDate.toFormat("EEE, MMM d (h:mma -")
  }

  if (endMinutes === "00") {
      formattedDay += endDate.toFormat(" ha")
  } else {
      formattedDay += endDate.toFormat(" h:mma")
  }

  formattedDay += (`, ${durString})`)

  return formattedDay

}

function getTotalDuration(dateRanges) {
  let totalDuration = 0;
  dateRanges.forEach(range => {
    const start = range[0];
    const end = range[1];
    const duration = Interval.fromDateTimes(start, end).toDuration('minutes').toObject().minutes;
    totalDuration += duration;
  });

  const hours = Math.floor(totalDuration/60);
  const minutes = Math.floor(totalDuration%60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours} hours`;
  } else {
    return `${minutes} minutes`;
  }
}

async function sendNotificationToHowLongLeft(title, subtitle, body, data, segment) {

  console.log("Notification Content: \n" + title + "\n" + subtitle + "\n"+ body);

  console.log(data);

  let segmentArray = [];

  segmentArray.push("HWDebug");

  if (!checkDebug()) {
    segmentArray.push("HWShifts");
  }

  if (segmentArray.length > 0) {
    console.log("Sending notification to segments "+ segmentArray);
  }
  
  const options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic NWE5ZTBjNzMtYzM5NS00ZTVmLWFlZjktMDcyMzMwZTUwMjU1',
    }
  };
  
  const dataPayload = {
    app_id: "6d1e33c8-d94f-4e2d-8579-981dfbfb1f09",
    included_segments: segmentArray,
    headings: {en: title},
    subtitle: {en: subtitle},
    contents: {en: body},
    data: {"Shifts": data},
    content_avaliable: true,
    mutable_content: true,
    name: 'HWShifts',
    ios_category: 'HWShifts'
  };

  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', dataPayload, options);
    const responseJson = response.data;
    console.log(responseJson);
  } catch (error) {
    console.log(`Request failed. Expected 200, got ${error.response.status}: ${error.response.data}`);
    // ...
  }
}

function getDateRanges(data) {
  const dateRanges = [];
  for (let i = 0; i < data.length; i++) {
    const startDate = Math.floor(data[i].startDate / 1000); // convert to seconds
    const endDate = Math.floor(data[i].endDate / 1000); // convert to seconds
    dateRanges.push([startDate, endDate]);
  }
  return dateRanges;
}
