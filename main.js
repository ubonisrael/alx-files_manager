/* eslint-disable quotes */
import dbClient from "./utils/db";

function waitConnection() {
  return new Promise((resolve, reject) => {
    let i = 0;
    const repeatFct = async () => {
      setTimeout(() => {
        i += 1;
        if (i >= 10) {
          reject();
        } else if (!dbClient.isAlive()) {
          repeatFct();
        } else {
          resolve();
        }
      }, 1000);
    };
    repeatFct();
  });
}

(async () => {
  try {
    console.log(dbClient.isAlive());
    await waitConnection();
    console.log(dbClient.isAlive());
    console.log(await dbClient.nbUsers());
    console.log(await dbClient.nbFiles());
  } catch (error) {
    console.log(error);
  }
})();
