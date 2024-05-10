import { Network } from "@dydxprotocol/v4-client-js";
import { DYDXBot } from "./dydx/dydx-bot";
import { APIGatewayProxyCallback, APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Bot, Input } from "./bot";
import { StatelessTrendStrat } from "./strategy/strat-trend-stateless";

/**
 * Response parameters for the APIGateway callback
 */
export interface CallbackResponseParams {
    response_error?: Error;
    response_success?: APIGatewayProxyResult;
}

/**
 * Main handler for the lambda function
 */
exports.handler = function (event: APIGatewayProxyEvent, context: Context, callback: APIGatewayProxyCallback) {
  
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    try {

        // Input mapping
        if(event.body === undefined) throw new Error("Body not defined");
        const input : Input = new Input(event.body as string);

        // EmitKey check
        if(input.emitKey !== process.env.BOT_EMIT_KEY) {
            exit(callback, {response_error:new Error("not authorized"), response_success:undefined} );
        }
        else {
            // dYdX
            DYDXHandler(input, context, callback);
        }

    } 
    catch(e) {
        console.error(e);
        // Return generic error
        exit(callback, {response_error: new Error("Error"), response_success:undefined} );
    }
    
};

/**
 * Exit the lambda function
 */
function exit(callback: APIGatewayProxyCallback, response: CallbackResponseParams) {
    console.log(response);
    callback(response.response_error, response.response_success);
}

/**
 * Run a dYdX bot
 */
function DYDXHandler(input: Input, context: Context, callback: APIGatewayProxyCallback) {

    let network: Network;
    
    if(process.env.BOT_NETWORK === Bot.NETWORK_MAINNET) {
        network = Network.mainnet();
    } else if(process.env.BOT_NETWORK === Bot.NETWORK_TESTNET) {
        network = Network.testnet();
    } else  { 
        throw new Error("Network not defined");
    }
    const bot: DYDXBot = new DYDXBot(network);

    // Connect and process the event
    bot.connect().then((address: string): void => {

        console.log("Connected to dydx with " + address);

        if(process.env.BOT_DEBUG === "true") bot.discord.sendDebug(`INPUT: ${JSON.stringify(input, null, 2)}`)

        bot.process(input, new StatelessTrendStrat(), context).then((response: CallbackResponseParams) => {
            exit(callback,response);
        }).catch((e: Error): void => {
            throw e;
        }).finally  ((): void => {
            bot.disconnect();       
        });

    }).catch((e: Error): void => {
        console.error(e);
        // Return generic error
        exit(callback, {response_error: new Error("Error"), response_success:undefined} );
    });

}
