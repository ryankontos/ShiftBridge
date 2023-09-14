
import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import puppeteer from "puppeteer";
import { readFile } from 'fs/promises';
import path from 'path';

 export async function scrapeShiftData() {

   console.log("Scraping data...");
  
    let html = await getHTML()
  
    const $ = cheerio.load(html);
  
    const dateObjects = [];

  $('li[id^="group20"]').each(function () {
    const id = $(this).attr('id');
    const date = id.replace('group', '');

    $(this).find('.event-item').each(function () {
      const eventType = $(this).data('event-type');

      if (eventType === 'regularshift') {
        const timeElement = $(this).find('time').text();
        const timeInfo = timeElement.match(/\d{2}:\d{2} - \d{2}:\d{2}/)[0];
        const [startTime, endTime] = timeInfo.split(' - ').map(time => time.trim());

        const startDate = DateTime.fromFormat(date + startTime, 'yyyyMMddHH:mm', { zone: 'local' });
        let endDate = DateTime.fromFormat(date + endTime, 'yyyyMMddHH:mm', { zone: 'local' });

        if (endDate < startDate) {
          endDate = endDate.plus({ days: 1 });
        }

        const isInFuture = (startDate >= DateTime.now())

        const diff = endDate.diff(startDate);
        const durationString = diff.toFormat('hh:mm');

          if (isInFuture) {

          dateObjects.push({
            startDate: startDate.toMillis(),
            endDate: endDate.toMillis(),
            sourceInfo: {
              date: date,
              start: startTime,
              end: endTime,
            }
          });

        } else {
          console.log("Skipping past event.")
        }
      }
    });
  });

return dateObjects;

   

}

async function getHTML() {

  
  const currentFilePath = new URL(import.meta.url).pathname;
  const currentDirPath = path.dirname(currentFilePath);
  const dataFilePath = path.join(currentDirPath, '..', 'data', 'credentials.json');

  const data = await readFile(dataFilePath, 'utf8');
  const credentials = JSON.parse(data);
  const username = credentials.username;
  const password = credentials.password;

    console.log("Launching browser!");

    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
    });
  
  
 
    console.log("Browser launched");



    const context = await browser.createIncognitoBrowserContext()
    console.log("New context created");
    const page = await context.newPage();
    console.log("New Page created");

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    await page.goto('https://krispykremeanz.prd.mykronos.com/ess#/');
    console.log("Going to login page");
    await page.waitForNavigation();

    console.log("Waiting for login page...");
    await page.waitForTimeout(6000);
    console.log("Reached login page...");
    console.log(`Page title: ${await page.title()}`)

    console.log("Entering login info");
    await page.type('input[id="idToken1"]', username);
    await page.type('input[id="idToken2"]', password);

    await page.setJavaScriptEnabled(true);

    console.log("Clicking login button");
    await page.click('input[id="loginButton_0"]');
  
    console.log("Waiting for schedule...");
    await page.waitForTimeout(6000);

    const html = await page.content();
    console.log("Returning HTML!");


    context.close();
    return html;
  }

 