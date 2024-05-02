import { Network } from "@dydxprotocol/v4-client-js";
import { DYDXBot } from "./dydx/dydx-bot";
import { BasicStrat } from "./strategy/strat-basic";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { Bot, Input } from "./bot";

export interface CallbackResponseParams {
    response_error: Error|null;
    response_success: any;
}
export type CallbackResponse = (response_error: Error|null, response_success: any) => any;

exports.handler = function (event: APIGatewayProxyEvent, context: Context, callback: CallbackResponse) {
  
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    try {

        // Input mapping
        if(event.body === undefined) throw new Error("Body not defined");
        const input : Input = new Input(event.body as string);

        // EmitKey check
        if(input.emitKey !== process.env.EMIT_KEY) {
            exit(callback, {response_error:new Error("not authorized"), response_success:undefined} );
        }
        else {

            // dYdX
            DydxHandler(input, context, callback);

        }

    } 
    catch(e: any) {
        console.error(e);
        exit(callback, {response_error: new Error("Error"), response_success:undefined} );
    }
    
};

function exit(callback: CallbackResponse, response: CallbackResponseParams) {
    console.log(response);
    callback(response.response_error, response.response_success);
}

function DydxHandler(input: Input, context: Context, callback: CallbackResponse) {

    let network: Network;
    
    if(process.env.NETWORK === Bot.NETWORK_MAINNET) {
        network = Network.mainnet();
    } else if(process.env.NETWORK === Bot.NETWORK_TESTNET) {
        network = Network.testnet();
    } else  { 
        throw new Error("Network not defined");
    }
    const bot: DYDXBot = new DYDXBot(network);

    bot.connect().then((address: string): void => {

        console.log("Connected to dydx with " + address);

        bot.process(input, new BasicStrat(), context).then((response: CallbackResponseParams) => {
            exit(callback,response);
        }).catch((e: any): void => {
            throw new Error(e);
        }).finally  ((): void => {
            bot.disconnect();       
        });

    }).catch((e: any): void => {
        exit(callback, {response_error: new Error("Error"), response_success:undefined} );
    });

}
