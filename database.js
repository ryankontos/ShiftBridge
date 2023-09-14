import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { readFile } from "fs/promises";
import { DateTime } from "luxon";
import { checkDebug } from "./configuration.js";

// Load the AWS credentials from awsconfig.json
const awsConfig = JSON.parse(await readFile("awsconfig.json"));

// Set the region
const REGION = "us-east-1";

// Create an instance of the DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

// Create a function to write an item to the table
export async function writeShift(object, table, dateID) {

    if (checkDebug()) {
      table = table + "_Debug"
    }

    const id = `${object.startDate}_${object.endDate}`

    console.log(`Attempting to write: ${id}`)

  const params = {
    TableName: table,
    Item: {
    shiftID: { S: id },
    dateID: { S: dateID },
    },
  };

  const command = new PutItemCommand(params);

  try {
    const response = await client.send(command);
    console.log("Item written to table:", response);
  } catch (err) {
    console.error(err);
  }
}

export async function checkShiftExists(object, inTable) {


    if (checkDebug()) {
      inTable = inTable + "_Debug"
    }

    const id = `${object.startDate}_${object.endDate}`

   

    const params = {
      TableName: inTable,
      Key: {
        shiftID: { S: id },
      },
    };
  
    const command = new GetItemCommand(params);
  
    try {
      const response = await client.send(command);
      const exists = response.Item !== undefined;
      return exists
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  export async function calendarDatabaseWriteShifts(shifts) {

    const dateKey = DateTime.now().toMillis().toString()

    for (const shift of shift) {
      await writeShift(shift, "HWScrape_CalendarSavedShifts", dateKey);
    }

  }

  export async function notifDatabaseWriteShifts(shifts) {

    const dateKey = DateTime.now().toMillis().toString()

    for (const shift of shifts) {
      await writeShift(shift, "HWScrape_NotificationSentShifts", dateKey);
    }

  }
 
  export async function matchToNotifDatabase(shifts) {

    const temp = [];

    let match = false
    let newShifts = false

    for (const shift of shifts) {
      
    const shiftExists = await checkShiftExists(shift, "HWScrape_NotificationSentShifts");
        
      if (shiftExists) {
        match = true
      } else {
        temp.push(shift);
        newShifts = true
      }
    }

    if (match && newShifts) {
        return [temp, 2]
    } else if (newShifts) {
        return [temp, 1]
    } else {
        return [temp, 0]
    }

    

  }


  export async function getShiftsNotInNotifDatabase(shifts) {

    const temp = [];

    for (const shift of shifts) {
      const shiftExists = await checkShiftExists(shift, "HWScrape_NotificationSentShifts");
    if (!shiftExists) {
      temp.push(shift);
      }
    }

    return temp

  }

  export async function getShiftsNotInCalendarDatabase(shifts) {

    

    const temp = [];

    for (const shift of shifts) {
      const shiftExists = await checkShiftExists(shift, "HWScrape_CalendarSavedShifts");
    if (!shiftExists) {
      temp.push(shift);
      }
    }

    return temp

  }

  export async function writeCookies(cookies) {

   

  const params = {
    TableName: "HWScrape_Data",
    Item: {
        dataID: { S: "LatestEDCookies" },
        cookies: {S: cookies }
    },
  };

  const command = new PutItemCommand(params);

  try {
    const response = await client.send(command);
  } catch (err) {
    console.error(err);
  }
}

export async function readCookies() {

    const params = {
      TableName: "HWScrape_Data",
      Key: {
        dataID: { S: "LatestEDCookies" },
      },
    };
  
    const command = new GetItemCommand(params);
  
    try {
      const response = await client.send(command);
      if (response.Item !== undefined) {
        console.log("Found cookie in AWS")
        return response.Item.cookies.S
      } else {
        console.log("Did not find cookie in AWS")
        return null
      }
      
    } catch (err) {
      console.error(err);
      return null;
    }
  }
