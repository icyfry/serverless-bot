import dotenv from 'dotenv';
import { Input } from '../src/bot';

dotenv.config();

describe("bot", () => {

  it("parse input", async () => {
    const input : Input = new Input("{\"source\": \"MOCK\" , \"market\":\"BTC-USD\" , \"price\": \"10000\" , \"details\" : { \"action\":\"BUY\"  } }");
    expect(input.market).toBe("BTC-USD");
  });

});