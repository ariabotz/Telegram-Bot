const { Telegraf } = require('telegraf');
const { MongoClient } = require('mongodb');

const botToken = process.env.TELEGRAM_BOT_KEY;
const uri = 'mongodb+srv://prakhardoneria:Yash2021@tgdb.tjafx2x.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(uri);

const bot = new Telegraf(botToken);

bot.start(ctx => {
  try {
    const senderId = ctx.from.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      ctx.reply(`Welcome Admin!\nSender ID: ${senderId}\nSender Username: ${senderUsername}`);
    } else {
      ctx.reply(`Welcome!\nSender ID: ${senderId}\nSender Username: ${senderUsername}`);
    }
  } catch (error) {
    console.error('Error handling start command:', error);
    ctx.reply('Error processing start command. Please try again later.');
  }
});

bot.command('report', async (ctx) => {
  try {
    const userIdToReport = ctx.message.reply_to_message.from.id;
    const reportedMessage = ctx.message.reply_to_message.text;
    const reporterUsername = ctx.message.from.username || ctx.message.from.first_name;

    ctx.reply(`FIR Registered!\nUsername: ${userIdToReport}\nMessage: ${reportedMessage}\nReported by: ${reporterUsername}`);
  } catch (error) {
    console.error('Error processing report command:', error);
    ctx.reply('Error processing the report. Please try again later.');
  }
});

bot.command('ban', async (ctx) => {
  try {
    const userIdToBan = ctx.message.reply_to_message.from.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('TgDB');
      const bansCollection = database.collection('bans');

      const isBanned = await bansCollection.findOne({ userId: userIdToBan });

      if (!isBanned) {
        await bansCollection.insertOne({ userId: userIdToBan });
        ctx.reply('User banned!');
      } else {
        ctx.reply('User is already banned!');
      }
    } else {
      ctx.reply('You do not have permission to ban users.');
    }
  } catch (error) {
    console.error('Error processing ban command:', error);
    ctx.reply('Error processing the ban. Please try again later.');
  } finally {
    await client.close();
  }
});

bot.command('getChatID', async (ctx) => {
  try {
    const chatId = ctx.message.chat.id;
    ctx.reply(`The Chat ID is: ${chatId}`);
  } catch (error) {
    console.error('Error processing getChatID command:', error);
    ctx.reply('Error processing the getChatID. Please try again later.');
  }
});

bot.command('purge', async (ctx) => {
  try {
    const chatId = ctx.message.chat.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      const chatMember = await ctx.telegram.getChatMember(chatId, ctx.message.from.id);

      if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
        const chatInfo = await ctx.telegram.getChat(chatId);

        const lastMessageId = ctx.message.message_id;

        for (let messageId = 1; messageId <= lastMessageId; messageId++) {
          await ctx.telegram.deleteMessage(chatId, messageId);
        }

        ctx.reply(`All messages from the chat "${chatInfo.title}" have been deleted.`);
      } else {
        ctx.reply('You need to be an administrator to use this command.');
      }
    } else {
      ctx.reply('You do not have permission to purge messages.');
    }
  } catch (error) {
    console.error('Error processing purge command:', error);
    ctx.reply('Error processing the purge. Please try again later.');
  }
});

bot.command('unwarn', async (ctx) => {
  try {
    const userIdToUnwarn = ctx.message.reply_to_message.from.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('TgDB');
      const warnsCollection = database.collection('warns');

      const currentWarns = await warnsCollection.findOne({ userId: userIdToUnwarn }) || { count: 0 };

      if (currentWarns.count > 0) {
        await warnsCollection.updateOne(
          { userId: userIdToUnwarn },
          { $inc: { count: -1 } }
        );

        ctx.reply(`Warning removed for the user! Total warns: ${currentWarns.count - 1}`);
      } else {
        ctx.reply('User does not have any warns to remove.');
      }
    } else {
      ctx.reply('You do not have permission to unwarn users.');
    }
  } catch (error) {
    console.error('Error processing unwarn command:', error);
    ctx.reply('Error processing the unwarn. Please try again later.');
  } finally {
    await client.close();
  }
});

bot.command('clearDB', async (ctx) => {
  try {
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('TgDB');
      const bansCollection = database.collection('bans');
      const warnsCollection = database.collection('warns');

      await bansCollection.deleteMany({});
      await warnsCollection.deleteMany({});

      ctx.reply('All data in bans and warns collections has been cleared.');
    } else {
      ctx.reply('You do not have permission to clear the database.');
    }
  } catch (error) {
    console.error('Error processing clearDB command:', error);
    ctx.reply('Error processing the clearDB. Please try again later.');
  } finally {
    await client.close();
  }
});

// ... (previous code)

async function getTotalSpaceConsumed(database) {
  const stats = await database.command({ dbStats: 1, scale: 1024 });
  return `${(stats.dataSize / 1024).toFixed(2)} KB`;
}

bot.command('showDB', async (ctx) => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('TgDB');
    const bansCollection = database.collection('bans');
    const warnsCollection = database.collection('warns');

    const bansData = await bansCollection.find().toArray();
    const warnsData = await warnsCollection.find().toArray();

    if (bansData.length === 0 && warnsData.length === 0) {
      ctx.reply('No data found in bans and warns collections.');
      return;
    }

    const response = {
      bans: bansData,
      warns: warnsData,
      totalSpace: await getTotalSpaceConsumed(database),
    };

    const formattedResponse = JSON.stringify(response, null, 2);
    ctx.replyWithMarkdownV2(`\`\`\`json\n${formattedResponse}\n\`\`\``);
  } catch (error) {
    console.error('Error processing showDB command:', error);
    ctx.reply('Error processing the showDB. Please try again later.');
  } finally {
    await client.close();
  }
});

// ... (remaining code)

bot.command('warn', async (ctx) => {
  try {
    const userIdToWarn = ctx.message.reply_to_message.from.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('TgDB');
      const warnsCollection = database.collection('warns');
      const bansCollection = database.collection('bans');

      const currentWarns = await warnsCollection.findOne({ userId: userIdToWarn }) || { count: 0 };

      if (currentWarns.count < 3) {
        await warnsCollection.updateOne(
          { userId: userIdToWarn },
          { $inc: { count: 1 } },
          { upsert: true }
        );

        ctx.reply(`User warned! Total warns: ${currentWarns.count + 1}`);
      } else {
        // Max warns reached, trigger ban
        await bansCollection.insertOne({ userId: userIdToWarn });
        ctx.reply(`User has reached the maximum number of warns (${currentWarns.count}). User banned!`);
      }
    } else {
      ctx.reply('You do not have permission to warn users.');
    }
  } catch (error) {
    console.error('Error processing warn command:', error);
    ctx.reply('Error processing the warn. Please try again later.');
  } finally {
    await client.close();
  }
});

bot.command('unban', async (ctx) => {
  try {
    const userIdToUnban = ctx.message.reply_to_message.from.id;
    const senderUsername = ctx.from.username;

    if (senderUsername === "PrakharDoneria") {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('TgDB');
      const bansCollection = database.collection('bans');

      const isBanned = await bansCollection.findOne({ userId: userIdToUnban });

      if (isBanned) {
        await bansCollection.deleteOne({ userId: userIdToUnban });
        ctx.reply('User unbanned!');
      } else {
        ctx.reply('User is not banned!');
      }
    } else {
      ctx.reply('You do not have permission to unban users.');
    }
  } catch (error) {
    console.error('Error processing unban command:', error);
    ctx.reply('Error processing the unban. Please try again later.');
  } finally {
    await client.close();
  }
});

const mediaTypes = ['text', 'audio', 'video', 'photo', 'document', 'voice', 'sticker', 'location', 'contact', 'animation'];

mediaTypes.forEach(mediaType => {
  bot.on(mediaType, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const isBanned = await isUserBanned(userId);

      if (isBanned) {
        await ctx.deleteMessage();
      } else {
        // Enjoy
      }
    } catch (error) {
      console.error(`Error handling ${mediaType} command:`, error);
      ctx.reply(`Error processing the ${mediaType} command. Please try again later.`);
    } finally {
      console.log('Done')
    }
  });
});

async function isUserBanned(userId) {
  try {
    await client.connect();
    const database = client.db('TgDB');
    const bansCollection = database.collection('bans');

    const isBanned = await bansCollection.findOne({ userId: userId });
    return !!isBanned;
  } catch (error) {
    console.error('Error checking if user is banned:', error);
    return false;
  } finally {
    console.log('Disconnected')
  }
}

bot.launch().then(() => {
  console.log('Bot is running!');
}).catch((error) => {
  console.error('Error starting the bot:', error.message);
});
