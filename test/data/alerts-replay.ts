import { Input } from '../../src/bot';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Strat } from "../../src/strategy/strat";
import { MockBot } from '../__mocks__/bot-mock';

export interface Alert {
    "Nom" : string;
    "Description" : string;
  }

/**
 * Replay alerts from a csv file
 */
export async function replayAlerts(strat: Strat) {

  const INITIAL_BALANCE = 1000;
  const bot: MockBot = new MockBot(INITIAL_BALANCE);
  const alerts: Alert[] = [];

  // Read alerts from csv
  await new Promise((resolve, reject) => {
    fs.createReadStream('./test/data/alerts-history.csv')
      .pipe(csvParser())
      .on('data', (data: Alert) => {
        alerts.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  // Process alerts
  for (const alert of alerts) {
    const input: Input = new Input(alert.Description);
    await bot.process(input, strat, undefined);
  }

  // Successful strategy
  expect(bot.getFullBalance()).toBeGreaterThanOrEqual(INITIAL_BALANCE)

  console.log(bot.getHeatMap());
  console.log("performance : " + ((bot.getFullBalance()/INITIAL_BALANCE)-1)*100 + " %");

}
  