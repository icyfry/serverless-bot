import { BotOrder, Input } from "../bot";

/**
 * Strategy to be executed by the bot
 */
export abstract class Strat {
    
    // Orders size in USD
    public R  = Number(process.env.BOT_R_USD);

    // Orders ids
    private OrderIdTracker: number = Math.floor(Math.random() * 10000000);

    /**
     * Stateless orders deduction
     * @param input input data
     */
    public abstract getStatelessOrdersBasedOnInput(input: Input): BotOrder[];

    /**
     * @returns return the next available order id to use
     */
    public getNextOrderId(): number {
        return this.OrderIdTracker++;
    }

    /**
     * @returns the name of the strategy
     */
    public abstract getName(): string;

}
