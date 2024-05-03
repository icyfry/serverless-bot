import { OrderExecution, OrderSide, OrderTimeInForce, OrderType } from '@dydxprotocol/v4-client-js';
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Context } from 'aws-lambda';
import { Strat } from './strategy/strat';
import { Discord } from './communication/discord';
import { CallbackResponseParams } from './main';

/**
 * Input of the bot
 */
export class Input {
    public market = "BTC-USD";
    public price = 0;
    public source: InputSource = InputSource.Mock;
    public details: InputDetails = {};
    public emitKey = "nokey";
    public dryrun = false;
    public roundingFactor = 100000000; // 8 decimals
    constructor(event: string) {
        Object.assign(this, JSON.parse(event));
    }
}

/**
 * Output of the bot
 */
export class Output {
    public order: BotOrder;
    constructor(order: BotOrder) {
        this.order = order;
    }
    toString() : string { return JSON.stringify(
        {
            "order" : this.order,
        },
    null, 2); }
}

/**
 * Trade order
 */
export class BotOrder {
    public market = "BTC-USD"; // perpertual market id
    public type:OrderType  = OrderType.LIMIT; // order type
    public side:OrderSide = OrderSide.BUY; // side of the order
    public timeInForce:OrderTimeInForce = OrderTimeInForce.IOC;
    public execution:OrderExecution = OrderExecution.DEFAULT;
    public price = 0;
    public size = 0; // subticks are calculated by the price of the order
    public postOnly = false; // If true, order is post only
    public reduceOnly = false; // if true, the order will only reduce the position size
    public triggerPrice: number| undefined = undefined; // required for conditional orders
    public clientId = 0; // used by the client to identify the order
    public goodTillTime = 86400; // goodTillTime in seconds
}

export interface BrokerConfig {
    TESTNET_MNEMONIC: string;
    MAINNET_MNEMONIC: string;
    DISCORD_TOKEN: string;
}

export interface InputDetails {
}

export interface SuperTrendDetails extends InputDetails{
    action: string; // BUY or SELL
    limit: number;
}

export interface SMCDetails extends InputDetails{
    type: string;
}

export enum InputSource {
    SuperTrend = "SUPER_TREND",
    SMC = "SMART_MONEY_CONCEPTS",
    Mock = "MOCK"
}

export abstract class Bot {

    static readonly NETWORK_MAINNET: string = "mainnet";
    static readonly NETWORK_TESTNET: string = "testnet";

    static readonly SIDE_LONG: string = "LONG";
    static readonly SIDE_SHORT: string = "SHORT";

    // Discord interactions
    public discord: Discord;

    public constructor() {
        this.discord = new Discord();
    }

    /**
     * Place an order on the exchange
     * @param order Order to place
     * @returns transaction response
     */
    public abstract placeOrder(order:BotOrder): Promise<any>;

    /**
     * Close a position on the exchange
     * @param market the market to close
     * @param hasToBeSide the side the position has to be before closing (LONG or SHORT)
     * @param refPrice reference price to close the position
     * @returns transaction response and position closed
     */
    public abstract closePosition(market: string, hasToBeSide?: OrderSide, refPrice?: number): Promise<{tx: any, position: any}>;
    
    /**
     * Connect to the exchange
     * @returns address of the connected account
     */
    public abstract connect() : Promise<string>;

    /**
     * Disconnect from the exchange
     */
    public abstract disconnect(): Promise<void>;

    /**
     * Cancel order
     * @param market Market to cancel the order
     * @param clientId id of the order
     */
    public abstract cancelOrdersForMarket(market: string, clientId: number): Promise<any>;

    /**
     * Read config from the AWS Secrets Manager
     * @param secretName the name of the secret containing the config
     * @returns JSON object with values
     */
    public async getBrokerConfig(secretName: string): Promise<BrokerConfig> {
        const client = new SecretsManagerClient();
        const response = await client.send(
          new GetSecretValueCommand({
            SecretId: secretName,
          }),
        );
        if (response.SecretString) {
          return JSON.parse(response.SecretString) as BrokerConfig;
        }
        else {
            throw new Error("Secret format not supported");
        }
    };

    /**
     * Process the lambda event
     * @param input input of the lambda
     * @param strategy the strategy to apply
     * @param context the context
     * @returns the response
     */
    public async process(input: Input, strategy: Strat, context?: Context): Promise<CallbackResponseParams> {

        // Return of the process
        const response: CallbackResponseParams = {
            response_error: null,
            response_success: {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: {"message": "no message"}
            }
        };

        try {

            // Stop on dryrun
            if(input.dryrun) throw new Error("dryrun : process not executed");

            // Order
            const order: BotOrder = strategy.getStatelessOrderBasedOnInput(input);
            
            // Close previous position on this market
            try{
                const closingTransaction: any = await this.closePosition(order.market, order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY);
                await this.discord.sendMessageClosePosition(order.market, closingTransaction.position, closingTransaction.tx);
            } catch(e: any) {
                // Position not closed
                console.warn(e);
                await this.discord.sendError(e);
            }
            
            const orderTransaction: any = await this.placeOrder(order);
            await this.discord.sendMessageOrder(order, input, strategy, orderTransaction);
            
            // Output
            const output: Output = new Output(order);
            console.log("Output "+output);
            response.response_success.body = JSON.stringify({"message": "process done"});
            
        }
        catch(e: any) {
            await this.discord.sendError(e);
            response.response_success=null;
            response.response_error=new Error(e);
        }

        return response;

    }

}
