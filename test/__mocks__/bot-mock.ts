import { OrderSide } from "@dydxprotocol/v4-client-js";
import { Bot, BotOrder, Input } from "../../src/bot";
import { Strat } from "../../src/strategy/strat";
import { Context } from "aws-lambda";
import { CallbackResponseParams } from "../../src/main";

export class MockBot extends Bot {

    public balance: number;
    public openPositonsLongs: Map<string,number> = new Map();
    public openPositonsShorts: Map<string,number> = new Map();
    public prices: Map<string,number> = new Map();

    constructor(initialBalance: number) {
        super();
        this.balance = initialBalance;
    }

    /**
     * Return balance + last known value of open orders
     */
    public getFullBalance() : number {
        return this.balance + this.getLongBalance() - this.getShortBalance();
    }

    public getLongBalance() : number {
        let openOrdersValue: number = 0;
        this.openPositonsLongs.forEach((value: number,key: string) => {
            openOrdersValue += (this.prices.get(key) ?? 0) * value;
        });
        return openOrdersValue;
    }

    public getShortBalance() : number {
        let openOrdersValue: number = 0;
        this.openPositonsShorts.forEach((value: number,key: string) => {
            openOrdersValue += (this.prices.get(key) ?? 0) * value;
        });
        return openOrdersValue;
    }

    /**
     * @see Bot
     */
    public closePosition(market: string): Promise<{tx: any, position: any}> {
        // Longs
        if(this.openPositonsLongs.has(market)) {
            // Add order value to balance
            this.balance += (this.prices.get(market) ?? 0) * (this.openPositonsLongs.get(market) ?? 0);
            // Close order
            this.openPositonsLongs.delete(market);
        }
        // Shorts
        if(this.openPositonsShorts.has(market)) {
            // Add order value to balance
            this.balance -= (this.prices.get(market) ?? 0) * (this.openPositonsShorts.get(market) ?? 0);
            // Close order
            this.openPositonsShorts.delete(market);
        }
        return Promise.resolve({tx: {},  position: {}});
    }

    /**
     * @see Bot
     */
    async connect(): Promise<string> {
        return "0x123";
    }

    /**
     * @see Bot
     */
    async disconnect(): Promise<void> {
        // N/A
    }
    
    /**
     * @see Bot
     */
    public async process(input: Input, strategy: Strat, context?: Context): Promise<CallbackResponseParams> {

        const order: BotOrder = strategy.getStatelessOrderBasedOnInput(input);

        // Last known price
        this.prices.set(order.market, order.price);

        // Close previous position
        this.closePosition(order.market);

        // Open new position
        this.placeOrder(order);

        return Promise.resolve({response_error:null, response_success:null});

    }

    /**
     * @see Bot
     */
    async placeOrder(order: BotOrder): Promise<any> {
        const value = order.size * order.price;
        // Open new position
        if (order.side == OrderSide.BUY) {
            this.openPositonsLongs.set(order.market, (this.openPositonsLongs.get(order.market) ?? 0) + order.size);
            this.balance -= value;
        } else if (order.side == OrderSide.SELL) {
            this.openPositonsShorts.set(order.market, (this.openPositonsShorts.get(order.market) ?? 0) + order.size);
            this.balance += value;
        }

    }

    /**
     * @see Bot
     */
    async cancelOrdersForMarket(market: string, clientId: number): Promise<any> {
        // N/A
    }

}
