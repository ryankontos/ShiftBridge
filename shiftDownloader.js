
import axios from 'axios';
import { DateTime } from 'luxon';
import path from 'path';
import { readFile } from 'fs/promises';
import { readCookies, writeCookies } from './database.js';
import { checkForOldCookies } from './configuration.js';

  export async function downloadShifts() {
  
    let cookies = await checkForOldCookies() ? await readCookies() : await getNewCookies();
    let eventDispatchResult = await makeRequest(getEventDispatchRequestConfig(cookies));
    
    if (!Array.isArray(eventDispatchResult.data)) {
      console.log("First cookie request failed, trying again")
      cookies = await getNewCookies();
      eventDispatchResult = await makeRequest(getEventDispatchRequestConfig(cookies));
    } else {
      console.log("First ED request succeeded")
    }


    const regularShiftEvents = eventDispatchResult.data.filter(item => {
      return item.eventType === 'regularshift' || item.eventType === 'transfershift';
    });
  
    const data = regularShiftEvents
  .filter((obj) => {
    const startDateTime = DateTime.fromISO(obj.startDateTime, {
      zone: "Australia/Sydney",
    });
    const now = DateTime.now().setZone("Australia/Sydney");
    return startDateTime.diff(now, "seconds").seconds > 0;
  })
  .map((obj) => {
    const startDateTime = DateTime.fromISO(obj.startDateTime, {
      zone: "Australia/Sydney",
    });
    const endDateTime = DateTime.fromISO(obj.endDateTime, {
      zone: "Australia/Sydney",
    });

    return {
      startDate: startDateTime.toMillis(),
      endDate: endDateTime.toMillis(),
      sourceStart: obj.startDateTime,
      sourceEnd: obj.endDateTime,
    };
  });
    console.log(`Downloaded ${data.length} events from Kronos!`)
  
    return data;

  }
  
  async function getNewCookies() {


    const authRequestResult = await makeRequest(getRequestAuthConfig());

    const authId = authRequestResult.data.authId
  
    //console.log(`authId is ${authId}`)

    const loginRequestResult = await makeRequest(await getLoginRequestConfig(authId));
  
    console.log(`lrr: ${loginRequestResult}`);

    const cookies1 = loginRequestResult.headers['set-cookie'];
    
    const essRequestResult = await makeRequest(getESSRequestConfig(cookies1));
  
    const cookies2 = essRequestResult.headers['set-cookie'];

    const combinedCookies = cookies1.concat(cookies2);
  
    const portalRequestResult = await makeRequest(getPortalRequestConfig(combinedCookies));

    const cookies3 = portalRequestResult.headers['set-cookie'];

    const finalCookies = combineAndSortCookies(cookies1, cookies2, cookies3);

    await writeCookies(finalCookies)

    return finalCookies

  }

  async function makeRequest(config) {
    try {
      const response = await axios.request(config);
      return response;
    } catch (error) {
      console.warn(`Request error: ${error}`)
      return null
    }
  }
  
  function getRequestAuthConfig() {
  
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://cust03-prd01-ath01.prd.mykronos.com/authn/json/realms/root/realms/krispykremeaus_prd_01/authenticate?goto=https%3A%2F%2Fkrispykremeanz.prd.mykronos.com%3A443%2Fess%3Fagent_fragment_relay%3D%2523%252F',
      headers: { 
        'Referer': 'https://cust03-prd01-ath01.prd.mykronos.com/authn/XUI/?realm=/krispykremeaus_prd_01', 
        //'Cookie': 'authnamlbcookie=05; authnamlbcookie=05', 
        'Cache-Control': 'no-cache', 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', 
        'Host': 'cust03-prd01-ath01.prd.mykronos.com', 
        'Pragma': 'no-cache', 
        'Origin': 'https://cust03-prd01-ath01.prd.mykronos.com', 
        'Sec-Fetch-Dest': 'empty', 
        'Sec-Fetch-Site': 'same-origin', 
        'Content-Length': '0', 
        'Connection': 'keep-alive', 
        'Accept-Language': 'en-AU', 
        'Accept': 'application/json, text/javascript, */*; q=0.01', 
        'Content-Type': 'application/json', 
        'Accept-Encoding': 'gzip, deflate, br', 
        'Sec-Fetch-Mode': 'cors', 
        'X-Requested-With': 'XMLHttpRequest', 
        'X-NoSession': 'true', 
        'X-Username': 'anonymous', 
        'X-Password': 'anonymous', 
        'Accept-API-Version': 'protocol=1.0,resource=2.1'
      }
    };
  
    return config
  
  }
  
  async function getLoginRequestConfig(authId) {
  
    const currentFilePath = new URL(import.meta.url).pathname;
    const currentDirPath = path.dirname(currentFilePath);
    const dataFilePath = path.join('.', 'data', 'credentials.json');
  
    const credData = await readFile(dataFilePath, 'utf8');
    const credentials = JSON.parse(credData);
    const username = credentials.username;
    const password = credentials.password;

   let data = JSON.stringify({"authId": authId, "callbacks": [{"type": "NameCallback", "output": [{"name": "prompt", "value": "Username"}], "input": [{"name": "IDToken1", "value": username}], "_id": 0}, {"type": "PasswordCallback", "output": [{"name": "prompt", "value": "Password"}], "input": [{"name": "IDToken2", "value": password}], "_id": 1}]});
   //console.log((data)) 

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://cust03-prd01-ath01.prd.mykronos.com/authn/json/realms/root/realms/krispykremeaus_prd_01/authenticate?goto=https%3A%2F%2Fkrispykremeanz.prd.mykronos.com%3A443%2Fess%3Fagent_fragment_relay%3D%2523%252F',
      headers: { 
        'Referer': 'https://cust03-prd01-ath01.prd.mykronos.com/authn/XUI/?realm=/krispykremeaus_prd_01', 
        'Cookie': 'authnamlbcookie=05;', 
        'Cache-Control': 'no-cache', 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', 
        'Host': 'cust03-prd01-ath01.prd.mykronos.com', 
        'Pragma': 'no-cache', 
        'Origin': 'https://cust03-prd01-ath01.prd.mykronos.com', 
        'Sec-Fetch-Dest': 'empty', 
        'Sec-Fetch-Site': 'same-origin', 
        'Content-Length': '2700', 
        'Connection': 'keep-alive', 
        'Accept-Language': 'en-AU', 
        'Accept': 'application/json, text/javascript, */*; q=0.01', 
        'Content-Type': 'application/json', 
        'Accept-Encoding': 'gzip, deflate, br', 
        'Sec-Fetch-Mode': 'cors', 
        'X-Requested-With': 'XMLHttpRequest', 
        'X-NoSession': 'true', 
        'X-Username': 'anonymous', 
        'X-Password': 'anonymous', 
        'Accept-API-Version': 'protocol=1.0,resource=2.1'
      },
      data : data
    };
  
    return config;
    
  
  }
  
  function getPortalRequestConfig(cookie) {
  
  
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://krispykremeanz.prd.mykronos.com/sso/portal?tenantId=krispykremeaus_prd_01&time=1681802955365',
      headers: { 
        'Pragma': 'no-cache', 
        'Accept': 'application/json, text/plain, */*', 
        'Sec-Fetch-Site': 'same-origin', 
        'Accept-Language': 'en-AU,en;q=0.9', 
        'Accept-Encoding': 'gzip, deflate, br', 
        'Sec-Fetch-Mode': 'cors', 
        'Cache-Control': 'no-cache', 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', 
        'Referer': 'https://krispykremeanz.prd.mykronos.com/ess?tenantId=krispykremeaus_prd_01', 
        'Connection': 'keep-alive', 
        'Host': 'krispykremeanz.prd.mykronos.com', 
        'Sec-Fetch-Dest': 'empty', 
        'Cookie': cookie,
        'X-XSRF-TOKEN': 'DxcrNBQK-A7f-Gtz_OM1BlNy97bwC03oYML0'
      }
    };
    
  
    return config;
  
  
  }
  
  function getESSRequestConfig(cookies) {
  
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://krispykremeanz.prd.mykronos.com/ess?tenantId=krispykremeaus_prd_01#/',
    headers: { 
      'Pragma': 'no-cache', 
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 
      'Sec-Fetch-Site': 'same-site', 
      'Accept-Language': 'en-AU,en;q=0.9', 
      'Accept-Encoding': 'gzip, deflate, br', 
      'Sec-Fetch-Mode': 'navigate', 
      'Cache-Control': 'no-cache', 
      'Host': 'krispykremeanz.prd.mykronos.com', 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', 
      'Referer': 'https://cust03-prd01-ath01.prd.mykronos.com/', 
      'Connection': 'keep-alive', 
      'Cookie': cookies,
      'Sec-Fetch-Dest': 'document'
    }
  };
  
    return config;
  
  }
  
  function getEventDispatchRequestConfig(cookies) {
  
  const start = getDateString(-8);
  const end = getDateString(15);

  let data = '{"startDate":"","endDate":"","types":[{"name":"holiday","order":2,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/holiday/template.html"},{"name":"inprogresstimeoffrequest","order":3,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/inprogresstimeoffrequest/template.html"},{"name":"paycodeedit","order":4,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/paycodeedit/template.html"},{"name":"regularshift","order":5,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/regularshift/template.html"},{"name":"transfershift","order":7,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/transfershift/template.html"},{"name":"approvedtimeoffrequest","order":8,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/approvedtimeoffrequest/template.html"},{"name":"swaprequest","order":10,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/swaprequests/template.html"},{"name":"openshiftrequest","order":11,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/openshiftrequest/template.html"},{"name":"openshift","order":12,"domain":"SCHEDULING","isExclusivelyFrontEnd":false,"visible":true,"group":["filters"],"template":"components/employeeView/eventDefinitions/openshift/template.html"},{"name":"AVAILABILITY","order":1,"visible":true,"group":["layers"],"template":"components/employeeView/eventDefinitions/availability/template.html"}],"configId":3004008,"isRestEndpoint":true}';
  
  let obj = JSON.parse(data);
  obj.startDate = start;
  obj.endDate = end;
  
  let modifiedData = JSON.stringify(obj);

  const cookiesArray = cookies.split('; ');
  let xsrfToken = null;
  
  for (let i = 0; i < cookiesArray.length; i++) {
    const cookieParts = cookiesArray[i].split('=');
    const cookieName = cookieParts[0];
    const cookieValue = cookieParts[1];
    if (cookieName === 'XSRF-TOKEN') {
      xsrfToken = cookieValue;
      break;
    }
  }
  
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://krispykremeanz.prd.mykronos.com/myschedule/eventDispatcher',
    headers: { 
      'Content-Type': 'application/json;charset=utf-8', 
      'Cookie': cookies,
      'Pragma': 'no-cache', 
      'Accept': 'application/json, text/plain, */*', 
      'Sec-Fetch-Site': 'same-origin', 
      'Host': 'krispykremeanz.prd.mykronos.com', 
      'Cache-Control': 'no-cache', 
      'Sec-Fetch-Mode': 'cors', 
      'Accept-Language': 'en-AU,en;q=0.9', 
      'Origin': 'https://krispykremeanz.prd.mykronos.com', 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', 
      'Referer': 'https://krispykremeanz.prd.mykronos.com/ess?tenantId=krispykremeaus_prd_01', 
      'Content-Length': '2105', 
      'Accept-Encoding': 'gzip, deflate, br', 
      'Connection': 'keep-alive', 
      'Sec-Fetch-Dest': 'empty', 
      'X-XSRF-TOKEN': xsrfToken,
    },
    data : modifiedData
  };
  
    return config;
  
  }
  
  
  
  function combineAndSortCookies(cookies1, cookies2, cookies3) {
    const requiredKeys = [
      'XSRF-TOKEN',
      'deviceType',
      'authn_external_ssid',
      'AUTHZ_TOKEN',
      'JSESSIONID',
      'srv_id',
      'allTokens',
      'falconAuthCookie',
      'kronosAuthToken',
      'kronosCookie',
      'securityToken',
      'ssologin',
      'widgetToken',
      'IDP_URI',
      'AUTHN_TOKEN',
      'TENANT_AUTHORIZATION',
      'VANITY_URL',
      'authn_ssid',
      'authnamlbcookie',
      '_csrf'
    ];
  
    // Combine all cookie arrays
    const allCookies = [...cookies1, ...cookies2, ...cookies3];
  
    // Create an object to store unique cookies, using the newer value when duplicates are found
    const uniqueCookies = {};
    allCookies.forEach(cookie => {
      const [key, value] = cookie.split(';')[0].split('=');
      if (!uniqueCookies[key] || allCookies.indexOf(cookie) > allCookies.indexOf(`${key}=${uniqueCookies[key]}`)) {
        uniqueCookies[key] = value;
      }
    });
  
    // Add "deviceType=desktop" cookie if not already present
    if (!uniqueCookies['deviceType']) {
      uniqueCookies['deviceType'] = 'desktop';
    }
  
    // Sort cookies according to the requiredKeys order and convert them to an array
    const sortedCookies = requiredKeys
      .filter(key => uniqueCookies[key])
      .map(key => `${key}=${uniqueCookies[key]};`);
  
    // Check if any required key is missing and log an error message
    for (const key of requiredKeys) {
      if (!sortedCookies.some(cookie => cookie.startsWith(`${key}=`))) {
        console.error(`Required key not found: ${key}`);
      }
    }
  
    // Return the sorted cookies as a single string
    return sortedCookies.join(' ');
  }

  function getDateString(offset = 0) {
    const today = DateTime.local();
    const date = today.plus({ days: offset });
    return date.toFormat('yyyy-MM-dd');
  }

  function isJSONObject(variable) {
    if (typeof variable === 'object') {
      try {
        JSON.parse(variable);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }