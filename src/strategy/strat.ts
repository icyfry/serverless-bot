import { BotOrder, Input } from "../bot";

export abstract class Strat {
    
    /**
     * Stateless order deduction
     * @param input input data
     */
    public abstract getStatelessOrderBasedOnInput(input: Input): BotOrder;

    /**
     * @returns the name of the strategy
     */
    public abstract getName(): string;

}
