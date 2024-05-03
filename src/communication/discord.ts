import { Client, ColorResolvable, EmbedBuilder, Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { BotOrder, Input, Output } from "../bot";
import { OrderSide } from "@dydxprotocol/v4-client-js";
import { Position } from "../dydx/dydx-bot";
import { Strat } from "../strategy/strat";

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

    public sendEmbedMessage(embed: EmbedBuilder): Promise<Message> {
        if(this.channel === undefined) throw new Error("Channel not initialized");
        if(!this.client?.isReady) throw new Error("Client not ready");
        return this.channel.send({ embeds: [embed] });
    }

    private getTxEmbedField(tx: any): any {
        let hash: string = tx?.hash;
        if (tx?.hash instanceof Uint8Array) {
            const decoder = new TextDecoder();
            hash = decoder.decode(tx?.hash);
        }
        return { name: `${hash} 🏷️`, value: `[see on mintscan.io](https://www.mintscan.io/dydx/tx/${hash})`, inline: true };
    }

    public sendMessageClosePosition(market: string, position?: Position, tx?: any): Promise<Message> {

        const embed = new EmbedBuilder()
        //.setAuthor({ name: `${process.env.LAMBDA_VERSION}`})
        .setTitle(`${market}`)
        .setColor(0x404040)
        .setDescription(`❌ Close position`)
        .setTimestamp();

        if (position !== undefined) embed.addFields({ name: `pnl`, value: `${position.realizedPnl}/${position.unrealizedPnl}`, inline: true });

        // if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));
        
        return this.sendEmbedMessage(embed);

    }

    public sendMessageOrder(order: BotOrder, input?: Input, strategy?: Strat, tx?: any): Promise<Message> {
        
        // Color of the embed
        let color: ColorResolvable;
        if (order.side == OrderSide.BUY) {
            color = 0x00FF7F;
        } else if (order.side == OrderSide.SELL) {
            color = 0xFF0000;
        } else {
            color = 0x000000;
        }

        const embed = new EmbedBuilder()
            //.setAuthor({ name: `${process.env.LAMBDA_VERSION}`})
            .setTitle(`${order.market}`)
            .setColor(color)
            .setDescription(`${order.side} **${order.size}** ${order.market} at **${order.price}** $ (${order.price*order.size} $)`)
            .setTimestamp();

        if (input !== undefined) embed.addFields({ name: `source`, value: `${input.source}`, inline: true });

        // if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));
        
        return this.sendEmbedMessage(embed);
        
    }

    public sendMessageOutput(output: Output): Promise<Message> {
        const message = output.toString();
        return this.sendMessage(message);
    }

    public sendError(message: string): Promise<Message> {
        return this.sendMessage("⚠️ "+message);
    }

}
