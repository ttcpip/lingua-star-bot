import { Menu } from '@grammyjs/menu';
import assert from 'assert';
import { Composer, InlineKeyboard } from 'grammy';
import { Op } from 'sequelize';
import { html } from 'telegram-format/dist/source';
import { Word, WordsCollection } from '../../../../database';
import { noop } from '../../../../helpers';
import { BotContext } from '../../../BotContext';
import { BotConversation } from '../../../BotConversation';
import { ctxt } from '../helpers';

export class Collections {
  static applyCollectionsManualHandlers(
    composer: Composer<BotContext>,
    wordsCollectionsMenu: Menu<BotContext>,
    readyCollectionsMenu: Menu<BotContext>,
  ) {
    /** collection */
    composer.callbackQuery(/goto:c(\d+)/, async (ctx) => {
      assert(ctx.match);
      const collectionId = +ctx.match[1];

      const [collection, wordsCount] = await Promise.all([
        WordsCollection.findByPk(collectionId),
        Word.count({ where: { wordsCollectionId: collectionId } }),
      ]);
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      const kb = new InlineKeyboard()
        .text(ctx.t('btn.collection-words-list'), `goto:`) // TODO
        .row()
        .text(ctx.t('btn.edit-collection'), `goto:de${collectionId}_0`) // TODO
        .text(ctx.t('btn.delete-collection'), `goto:dc${collectionId}_0`)
        .row()
        .text(ctx.t('btn.back'), `goto:tc`);

      await ctx.editMessageText(
        ctx.t('u.msg-collection', {
          name: html.escape(collection.name),
          wordsCount,
        }),
        { reply_markup: kb },
      );
    });

    /** delete collection */
    composer.callbackQuery(/goto:dc(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const collectionId = +ctx.match[1];
      const confirmed = !!+ctx.match[2];

      const [collection, wordsCount] = await Promise.all([
        WordsCollection.findByPk(collectionId),
        Word.count({ where: { wordsCollectionId: collectionId } }),
      ]);
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      if (!confirmed && wordsCount > 0) {
        return await ctx.editMessageText(
          ctx.t('u.delete-collection-confirm', {
            name: html.escape(collection.name),
            wordsCount,
          }),
          {
            reply_markup: new InlineKeyboard()
              .text(
                ctx.t('btn.delete-collection-confirm'),
                `goto:dc${collectionId}_1`,
              )
              .row()
              .text(ctx.t('btn.back'), `goto:c${collectionId}`),
          },
        );
      }

      await collection.destroy();

      ctx.answerCallbackQuery(ctx.t(`u.deleted-collection`)).catch(noop);
      await ctx.editMessageText(ctx.t('u.msg-words-collections'), {
        reply_markup: wordsCollectionsMenu,
      });
    });

    /** back from ready collection to ready collections list */
    composer.callbackQuery(/goto:brc/, async (ctx) => {
      await ctx.editMessageText(ctx.t('u.msg-ready-collections'), {
        reply_markup: readyCollectionsMenu,
      });
    });

    const getReadyCollectionInfo = async (
      ctx: BotContext,
      wordsCollectionId: number,
      page: number,
    ) => {
      const kb = new InlineKeyboard();

      const MAX_WORDS_PER_PAGE = 5;
      const [
        wordsCollection,
        thisPageWords,
        userWordsCollections,
        totalWordsCnt,
      ] = await Promise.all([
        WordsCollection.findByPk(wordsCollectionId),
        Word.findAll({
          where: { wordsCollectionId },
          limit: MAX_WORDS_PER_PAGE,
          offset: MAX_WORDS_PER_PAGE * page - MAX_WORDS_PER_PAGE,
        }),
        ctx.dbUser.$get('wordsCollections', { attributes: ['id'] }),
        Word.count({ where: { wordsCollectionId } }),
      ]);

      assert(wordsCollection);
      const alreadyWords = await Word.findAll({
        attributes: ['word'],
        where: {
          wordsCollectionId: { [Op.in]: userWordsCollections.map((e) => e.id) },
          word: { [Op.in]: thisPageWords.map((e) => e.word) },
        },
      });

      thisPageWords.forEach(({ id, word, hint }) => {
        const already = !!alreadyWords.find((e) => e.word === word);
        kb.text(
          `${already ? '✔️ ' : ''}${word} - ${hint}`,
          `goto:rcw${page}_${id}`,
        ).row();
      });

      const totalPagesCnt = Math.ceil(totalWordsCnt / MAX_WORDS_PER_PAGE);

      // We're creating btn for the first 3 and the last 2 pages
      for (let n = 1; n <= totalPagesCnt; n++) {
        const text = n === page ? `[${n}]` : `${n}`;
        const data = `goto:rc${wordsCollectionId}_${n}`;

        if (n === 1 || n === totalPagesCnt || (n <= page + 2 && n >= page - 2))
          kb.text(text, data);
      }
      kb.row();

      kb.text(ctx.t('btn.back'), `goto:brc`);
      kb.text(
        ctx.t('btn.add-whole-collection'),
        `goto:addwc${wordsCollectionId}_${page}`,
      );

      return { kb, wordsCollection, totalWordsCnt };
    };

    /** ready collections */
    composer.callbackQuery(/goto:rc(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const wordsCollectionId = +ctx.match[1];
      const page = +ctx.match[2];

      const { kb, wordsCollection, totalWordsCnt } =
        await getReadyCollectionInfo(ctx, wordsCollectionId, page);

      await ctx.editMessageText(
        ctx.t('u.msg-ready-collection', {
          name: html.escape(wordsCollection.name),
          wordsCount: totalWordsCnt,
        }),
        { reply_markup: kb },
      );
    });

    /** add whole collection */
    composer.callbackQuery(/goto:addwc(\d+)_(\d+)/, async (ctx) => {
      const wordsCollectionId = +(ctx.match || [] || [])[1];
      const page = +(ctx.match || [] || [])[2];

      const collection = await WordsCollection.findByPk(wordsCollectionId, {
        include: [Word],
      });
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));
      if (
        !collection.words ||
        (collection.words && collection.words.length <= 0)
      )
        return await ctx.answerCallbackQuery(ctx.t('u.no-words-in-coll'));

      assert(WordsCollection.sequelize);
      await WordsCollection.sequelize.transaction(async (transaction) => {
        const newCollection = await WordsCollection.create(
          {
            name: collection.name,
            userId: ctx.dbUser.id,
            isCommon: false,
          },
          { transaction },
        );
        if (!(collection.words && collection.words.length > 0)) return;
        await Word.bulkCreate(
          collection.words.map(({ word, hint, photo }) => ({
            wordsCollectionId: newCollection.id,
            word,
            hint,
            photo,
          })),
          { transaction },
        );
      });

      const { kb } = await getReadyCollectionInfo(ctx, wordsCollectionId, page);

      ctx.answerCallbackQuery(ctx.t('u.collection-added')).catch(noop);
      await ctx.editMessageReplyMarkup({ reply_markup: kb });
    });

    /** ready collection word */
    composer.callbackQuery(/goto:rcw(\d+)_(\d+)/, async (ctx) => {
      const page = +(ctx.match || [] || [])[1];
      const wordId = +(ctx.match || [] || [])[2];

      const [word, userCollections] = await Promise.all([
        Word.findByPk(wordId, { include: [WordsCollection] }),
        ctx.dbUser.$get('wordsCollections'),
      ]);
      if (!(word && word.wordsCollection))
        return await ctx.answerCallbackQuery(ctx.t('u.error'));
      if (userCollections.length <= 0)
        return await ctx.answerCallbackQuery({
          text: ctx.t('u.no-collections'),
          show_alert: true,
        });

      const kb = new InlineKeyboard();

      const MAX_BTNS_PER_LINE =
        userCollections.length <= 5 ? 1 : userCollections.length <= 14 ? 2 : 3;
      userCollections.forEach(({ id, name }, i) => {
        if (i && i % MAX_BTNS_PER_LINE === 0) kb.row();
        kb.text(`${name}`, `goto:rcwa${id}_${wordId}`);
      });
      kb.row();
      kb.text(ctx.t('btn.back'), `goto:rc${word.wordsCollection.id}_${page}`);

      await ctx.editMessageText(
        ctx.t('u.msg-ready-collection-word', {
          collectionName: html.escape(word.wordsCollection.name),
          word: html.escape(word.word),
          hint: html.escape(word.hint),
        }),
        { reply_markup: kb },
      );
    });

    /** ready collection word add */
    composer.callbackQuery(/goto:rcwa(\d+)_(\d+)/, async (ctx) => {
      const userCollectionId = +(ctx.match || [] || [])[1];
      const wordId = +(ctx.match || [] || [])[2];

      const word = await Word.findByPk(wordId);
      if (!word) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      await Word.create({
        word: word.word,
        hint: word.hint,
        photo: word.photo,
        wordsCollectionId: userCollectionId,
      });

      const kb = new InlineKeyboard()
        .text(ctx.t(`btn.to-the-word`), `TODO`)
        .row()
        .text(
          ctx.t(`btn.to-the-ready-collection`),
          `goto:rc${word.wordsCollectionId}_${1}`,
        );

      await ctx.editMessageText(ctx.t('u.msg-ready-collection-word-added'), {
        reply_markup: kb,
      });
    });

    /** to collections */
    composer.callbackQuery(/goto:tc/, async (ctx) => {
      await ctx.editMessageText(ctx.t('u.msg-words-collections'), {
        reply_markup: wordsCollectionsMenu,
      });
    });
  }

  static wordsTrainerMenuId = 'm.words-trainer';
  static getWordsTrainerMenu(wordsCollectionsMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(this.wordsTrainerMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('u.revise-words'))
      .row()
      .text(ctxt('u.all-words'))
      .submenu(
        ctxt('u.words-collections'),
        this.wordsCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-words-collections')),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
      );

    menu.register(wordsCollectionsMenu);
    return menu;
  }

  private static wordsCollectionsMenuId = 'm.words-collections';
  static getWordsCollectionsMenu(readyCollectionsMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(this.wordsCollectionsMenuId, {
      autoAnswer: false,
    })
      .submenu(
        ctxt('u.ready-collections'),
        this.readyCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-ready-collections')),
      )
      .row()
      .dynamic(async (ctx, range) => {
        const userCollections = await ctx.dbUser.$get('wordsCollections');
        const MAX_BTNS_PER_LINE =
          userCollections.length <= 5
            ? 1
            : userCollections.length <= 14
            ? 2
            : 3;
        userCollections.forEach(({ id, name }, i) => {
          if (i && i % MAX_BTNS_PER_LINE === 0) range.row();
          range.text({ text: name, payload: `goto:c${id}` });
        });
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-trainer')),
      )
      .text(ctxt('btn.create-collection'), (ctx) =>
        ctx.conversation.enter(this.createCollectionConversationId),
      );

    menu.register(readyCollectionsMenu);
    return menu;
  }

  private static readyCollectionsMenuId = 'm.ready-collections';
  static getReadyCollectionsMenu() {
    const menu = new Menu<BotContext>(this.readyCollectionsMenuId, {
      autoAnswer: false,
    })
      .dynamic(async (_, range) => {
        const collections = await WordsCollection.findAll({
          where: { isCommon: true },
        });
        const MAX_BTNS_PER_LINE =
          collections.length <= 5 ? 1 : collections.length <= 14 ? 2 : 3;
        collections.forEach(({ id, name }, i) => {
          if (i && i % MAX_BTNS_PER_LINE === 0) range.row();
          range.text({ text: name, payload: `goto:rc${id}_1` }, (_, next) =>
            next(),
          );
        });
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-collections')),
      );

    return menu;
  }

  public static createCollectionConversationId = 'create-collection';
  /** !!! All Side-effects Must Be Wrapped !!! */
  static getCreateCollectionConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      // const oldMarkup = ctx.callbackQuery?.message?.reply_markup;

      await ctx.editMessageText(ctx.t('u.send-new-collection-name'), {
        reply_markup: undefined,
      });

      let name = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 256)) {
          await ctx.reply(ctx.t('u.invalid-new-collection-name'));
          continue;
        }

        name = text;
      } while (!name);

      await conversation.external({
        task: () =>
          WordsCollection.create({
            name,
            userId: ctx.dbUser.id,
            isCommon: false,
          }),
      });

      await ctx.reply(ctx.t('u.collection-created'), {
        reply_markup: new InlineKeyboard().text(ctx.t('btn.back'), `goto:tc`),
      });
    };
  }
}
