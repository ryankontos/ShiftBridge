
let jsonData = {
};
  
export default jsonData;

export function setConfig(config) {
    jsonData = config
}

export function checkForOldCookies() {
    if (jsonData && typeof jsonData === 'object' && jsonData.checkForOldCookies !== undefined) {
        console.log(`Check for old cookies result: ${jsonData.checkForOldCookies}`)
      return jsonData.checkForOldCookies;
    } else {
        console.log(`Check for old cookies defaulting to false`)
      return false;
    }
  }

  export function checkDebug() {
    if (jsonData && typeof jsonData === 'object' && jsonData.debug !== undefined) {
      return jsonData.debug;
    } else {
      return false;
    }
  }
  
  