import dotenv from 'dotenv';
import { Input, InputSource, TrendSignalDetails } from '../src/bot';
import { BasicStrat } from '../src/strategy/strat-basic';
import { MockBot } from './__mocks__/bot-mock';

dotenv.config();

describe("bot", () => {

  it("parse input", async () => {
    const input : Input = new Input("{\"source\": \"MOCK\" , \"market\":\"BTC-USD\" , \"price\": \"10000\" , \"details\" : { \"action\":\"BUY\"  } }");
    expect(input.market).toBe("BTC-USD");
  });


  it("process", async () => {
    const bot: MockBot = new MockBot(0);
    const signal: TrendSignalDetails = new TrendSignalDetails("{\"trend\":\"BUY\",\"entry\":90,\"cancel\":80}");
    expect(signal.trend).toBe("BUY");
    expect(signal.entry).toBe(90);
    expect(signal.cancel).toBe(80);
    const input : Input = {interval:60, roundingFactorSize:10, roundingFactorPrice:100, dryrun:true, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.TrendSignal, details:signal};
    const strat = new BasicStrat();
    const response = await bot.process(input, strat, undefined);
    expect(response.response_error).toBe(undefined);
  });


});
