import { BotOrder, Input } from "../bot";

export abstract class Strat {
    
    public abstract getStatelessOrderBasedOnInput(input: Input): BotOrder;

}
