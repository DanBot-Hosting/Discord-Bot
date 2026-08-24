import { Snowflake } from "discord.js";
import ExtendedClient from "../classes/ExtendedClient";

import { premium } from "../config";
import { enabled as databaseEnabled } from "./database";

import User from "../models/User";

export async function add(user: Snowflake, amount: number, client: ExtendedClient): Promise<number> {
    if(!databaseEnabled()) throw new Error("Credit cannot be changed without a database.");

    const data = await User.findOne({ _id: user }) || new User({ _id: user, credit_amount: 0, credit_used: 0 });

    if(amount <= 0) throw new Error("Cannot add zero or negative credit.");

    data.credit_amount += amount;
    await data.save();

    const guild = client.guilds.cache.get(client.config_main.primaryGuild);
    const member = guild.members.cache.get(user);

    if(!member.roles.cache.has(client.config_roles.donator)) {
        await member.roles.add(client.config_roles.donator).catch((): null => null);
    }

    return data.credit_amount;
}

export async function fix(user: Snowflake): Promise<number> {
    if(!databaseEnabled()) return 0;

    const data = await User.findOne({ _id: user }) || { credit_used: 0 };

    // TODO: Fetch user's premium servers & fix count

    return data.credit_used;
}

export async function get(user: Snowflake): Promise<PremiumData> {
    if(!databaseEnabled()) return { donated: 0, used: 0 };

    const data = await User.findOne({ _id: user }) || { credit_amount: 0, credit_used: 0 };

    return {
        donated: data.credit_amount,
        used: data.credit_used
    }
}

export function getPrice(): number {
    return premium.price;
}

export async function remove(user: Snowflake, amount: number, client: ExtendedClient): Promise<number> {
    if(!databaseEnabled()) throw new Error("Credit cannot be changed without a database.");

    const data = await User.findOne({ _id: user }) || new User({ _id: user, credit_amount: 0, credit_used: 0 });

    if(amount <= 0) throw new Error("Cannot remove zero or negative credit.");
    if(data.credit_amount < amount) throw new Error(`<@${user}> does not have that much credit to remove.`);
    if(data.credit_used > data.credit_amount - amount) throw new Error(`Cannot remove credit from <@${user}> that is in use.`);

    data.credit_amount -= amount;
    await data.save();

    if(data.credit_amount === 0) {
        const guild = client.guilds.cache.get(client.config_main.primaryGuild);
        const member = guild.members.cache.get(user);

        await member.roles.remove(client.config_roles.donator).catch((): null => null);
    }

    return data.credit_amount;
}

export async function set(user: Snowflake, amount: number, client: ExtendedClient): Promise<number> {
    if(!databaseEnabled()) throw new Error("Credit cannot be changed without a database.");

    const data = await User.findOne({ _id: user }) || new User({ _id: user, credit_amount: 0, credit_used: 0 });

    if(amount < 0) throw new Error("Cannot set credit to a negative amount.");
    if(data.credit_used > amount) throw new Error(`You cannot set <@${user}>'s credit amount to less than they have used.`);

    data.credit_amount = amount;
    await data.save();

    if(data.credit_amount === 0) {
        const guild = client.guilds.cache.get(client.config_main.primaryGuild);
        const member = guild.members.cache.get(user);

        await member.roles.remove(client.config_roles.donator).catch((): null => null);
    } else {
        const guild = client.guilds.cache.get(client.config_main.primaryGuild);
        const member = guild.members.cache.get(user);

        if(!member.roles.cache.has(client.config_roles.donator)) {
            await member.roles.add(client.config_roles.donator).catch((): null => null);
        }
    }

    return data.credit_amount;
}

export type PremiumData = {
    donated: number;
    used: number;
}
