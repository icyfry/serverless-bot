import { Client, Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { BotOrder, Output } from "../bot";
import { OrderSide } from "@dydxprotocol/v4-client-js";

export class Discord {

    public client?: Client;
    public channel?: TextChannel;
    public prefix = ""; // global prefix for all messages

    constructor(prefix?: string) {
        if(prefix !== undefined) this.prefix = prefix;
    }

    public async login(token: string) {
    
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

        // Events
        this.client.once(Events.ClientReady, readyClient => {
            // console.log(`Logged to discord in as ${readyClient.user.tag}`);
        });

        // Login to discord
        await this.client.login(token);
        this.channel = (await this.client.channels.fetch(process.env.DISCORD_CHANNEL_ID as string)) as TextChannel;

    }

    public async logout(): Promise<void> {
        if(this.client === undefined) throw new Error("Client not initialized");
        this.client.removeAllListeners();
        await this.client.destroy();
    }

    public sendMessage(message: string): Promise<Message> {
        if(this.channel === undefined) throw new Error("Channel not initialized");
        if(!this.client?.isReady) throw new Error("Client not ready");
        return this.channel.send(this.prefix + message);
    }

    public sendMessageClosePosition(market: string, tx?: any): Promise<Message> {
        let message = (`❌ Closing position ${market} 🏷️${tx?.hash}`);
        return this.sendMessage(message);
    }

    public sendMessageOrder(order: BotOrder, tx?: any): Promise<Message> {
        let icon = "";
        if(order.side == OrderSide.BUY) {
            icon = "🟢";
        } else if(order.side == OrderSide.SELL) {
            icon = "🔴";
        }
        const message = `${icon} ${order.size} ${order.market} at ${order.price}$ 🏷️${tx?.hash}`;
        return this.sendMessage(message);
    }

    public sendMessageOutput(output: Output): Promise<Message> {
        const message = output.toString();
        return this.sendMessage(message);
    }

    public sendError(message: string): Promise<Message> {
        return this.sendMessage("⚠️ "+message);
    }

}
