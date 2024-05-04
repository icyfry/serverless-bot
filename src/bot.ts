import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { APIGatewayProxyResult, Context } from 'aws-lambda';
import { Strat } from './strategy/strat';
import { Discord } from './communication/discord';
import { CallbackResponseParams } from './main';
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse } from '@cosmjs/tendermint-rpc/build/tendermint37';
import { IndexedTx} from '@cosmjs/stargate';
import { OrderExecution, OrderSide, OrderTimeInForce, OrderType } from '@dydxprotocol/v4-client-js';

// Transaction response
export type TxResponse = BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx;

// Error that should not interrupt the bot
export class Warning extends Error {
    constructor(message?: string) {
      super(message);
      this.name = 'Warning';
    }
}

// Configuration of the broker connected to the bot
export interface BrokerConfig {
    TESTNET_MNEMONIC: string;
    MAINNET_MNEMONIC: string;
    DISCORD_TOKEN: string;
}

// A position on the broker
export interface Position {
    market: string,
    status: string,
    side: string,
    size: number,
    maxSize: number,
    entryPrice: number,
    exitPrice: number,
    realizedPnl: number, // in usd
    unrealizedPnl: number, // in usd
    createdAt: Date,
    createdAtHeight: number,
    closedAt: Date,
    sumOpen: number, // in crypto
    sumClose: number, // in crypto
    netFunding: number
}

// An order to place on the broker
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

// Output of the bot
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

// Input of the bot
export class Input {
    public market = "BTC-USD";
    public price = 0;
    public source: InputSource = InputSource.Mock;
    public details: InputDetails = {};
    public emitKey = "nokey";
    public dryrun = false;
    public roundingFactor = 100000000; // 8 decimals
    public interval = 60; // 1 minute
    constructor(event: string) {
        Object.assign(this, JSON.parse(event));
        // Rounding the prices
        this.price = Math.round(this.price*100)/100;
    }
}

// Commons details of the input
export interface InputDetails {
    plots?: string[];
}

// Available sources of input
export enum InputSource {
    SuperTrend = "SUPER_TREND",
    SMC = "SMART_MONEY_CONCEPTS",
    Mock = "MOCK"
}

// Details of the SuperTrend input
export class SuperTrendDetails implements InputDetails {
    public action = "BUY"; // BUY or SELL
    public limit = 0;
    public plots?: string[] = [];
    constructor(details: string) {
        Object.assign(this, JSON.parse(details));
        // Rounding the prices
        this.limit = Math.round(this.limit*100)/100;
    }
}

// Details of the SMC input
export interface SMCDetails extends InputDetails{
    type: string;
}

/**
 * Bot abstract class
 */
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
     * Place an order on the broker
     * @param order Order to place
     * @returns transaction response
     */
    public abstract placeOrder(order:BotOrder): Promise<TxResponse>;

    /**
     * Close a position on the broker
     * @param market the market to close
     * @param hasToBeSide the side the position has to be before closing (LONG or SHORT)
     * @param refPrice reference price used to close the position
     * @returns transaction response and position closed
     */
    public abstract closePosition(market: string, hasToBeSide?: OrderSide, refPrice?: number): Promise<{tx: TxResponse, position: Position}>;
    
    /**
     * Connect to the broker
     * @returns address of the connected account
     */
    public abstract connect() : Promise<string>;

    /**
     * Disconnect from the broker
     */
    public abstract disconnect(): Promise<void>;

    /**
     * Cancel an order
     * @param market Market to cancel the order
     * @param clientId id of the order to cancel
     */
    public abstract cancelOrdersForMarket(market: string, clientId: number): Promise<TxResponse>;

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
     * Process the lambda input event
     * @param input input of the lambda
     * @param strategy the strategy to apply
     * @param _context the context
     * @returns the response
     */
    public async process(input: Input, strategy: Strat, context?: Context): Promise<CallbackResponseParams> {

        console.log(context?.awsRequestId);

        // Return of the process
        const response: CallbackResponseParams = {
            response_error: undefined,
            response_success: {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: '{"message": "no message"}'
            }
        };

        try {

            // Stop on dryrun
            if(input.dryrun) throw new Error("dryrun : process not executed");

            // Order
            const order: BotOrder = strategy.getStatelessOrderBasedOnInput(input);

            // Close previous position on this market
            try{
            const closingTransaction: {tx: TxResponse, position: Position} = await this.closePosition(order.market, order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY, order.price);
            await this.discord.sendMessageClosePosition(order.market, closingTransaction.position, closingTransaction.tx);
            } catch(error) {
                if(error instanceof Warning) {
                    console.warn(error);
                    await this.discord.sendError(error); // Position not closed
                } else throw error;
            }
            
            // Open new position
            const orderTransaction: TxResponse = await this.placeOrder(order);
            await this.discord.sendMessageOrder(order, input, strategy, orderTransaction);
            
            // Output
            const output: Output = new Output(order);
            console.log("Output "+output);
            (response.response_success as APIGatewayProxyResult).body = JSON.stringify({"message": "process done"});
            
        }
        catch(error) {
            await this.discord.sendError(error as Error);
            response.response_success = undefined;
            response.response_error= error as Error;
        }

        return response;

    }

}
