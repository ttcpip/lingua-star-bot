import { Menu } from '@grammyjs/menu';
import assert from 'assert';
import { Composer, InlineKeyboard } from 'grammy';
import { Op } from 'sequelize';
import { html } from 'telegram-format/dist/source';
import { Word, WordsCollection } from '../../../../database';
import { noop } from '../../../../helpers';
import { BotContext } from '../../../BotContext';
import { BotConversation } from '../../../BotConversation';
import { appendUrl, ctxt } from '../helpers';
import { UserModule } from '../UserModule';

export class Collections {
  private static MAX_WORDS_PER_PAGE = 6 as const;

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

      const shareCollectionUrl = `t.me/${ctx.me.username}?start=wc_${collectionId}`;
      const kb = new InlineKeyboard()
        .text(ctx.t('btn.collection-words-list'), `goto:cwl${collectionId}_1`)
        .row()
        .text(ctx.t('btn.edit-collection'), `goto:ec${collectionId}`)
        .text(ctx.t('btn.delete'), `goto:dc${collectionId}_0`)
        .row()
        .text(ctx.t('btn.repeat-whole-collection'), `goto:csr${collectionId}_1`)
        .text(
          ctx.t('btn.dont-repeat-whole-collection'),
          `goto:csr${collectionId}_0`,
        )
        .row()
        .url(
          ctx.t('btn.share-collection'),
          `tg://msg_url?url=${encodeURIComponent(shareCollectionUrl)}`,
        )
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

    /** edit collection */
    composer.callbackQuery(/goto:ec(\d+)/, async (ctx) => {
      assert(ctx.match);
      const collectionId = +ctx.match[1];

      const collection = await WordsCollection.findByPk(collectionId);
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      await ctx.conversation.enter(Collections.editCollectionConversationId, {
        overwrite: true,
      });
    });

    /** collection words list */
    composer.callbackQuery(/goto:cwl(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const wordsCollectionId = +ctx.match[1];
      const page = +ctx.match[2];

      const [collection, thisPageWords, totalWordsCnt] = await Promise.all([
        WordsCollection.findByPk(wordsCollectionId),
        Word.findAll({
          where: { wordsCollectionId },
          limit: Collections.MAX_WORDS_PER_PAGE,
          offset:
            Collections.MAX_WORDS_PER_PAGE * page -
            Collections.MAX_WORDS_PER_PAGE,
        }),
        Word.count({ where: { wordsCollectionId } }),
      ]);
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      const kb = new InlineKeyboard();
      thisPageWords.forEach(({ id, word, hint }) => {
        kb.text(`${word} - ${hint}`, `goto:cw${id}_${page}`).row();
      });

      const totalPagesCnt = Math.ceil(
        totalWordsCnt / Collections.MAX_WORDS_PER_PAGE,
      );

      if (totalPagesCnt > 1) {
        for (let n = 1; n <= totalPagesCnt; n++) {
          const text = n === page ? `[${n}]` : `${n}`;
          const data = `goto:cwl${wordsCollectionId}_${n}`;

          if (
            n === 1 ||
            n === totalPagesCnt ||
            (n <= page + 2 && n >= page - 2)
          )
            kb.text(text, data);
        }
        kb.row();
      }

      kb.text(ctx.t('btn.back'), `goto:c${wordsCollectionId}`);

      await ctx.editMessageText(ctx.t('u.msg-collection-word-list'), {
        reply_markup: kb,
      });
    });

    const collectionWordHandler = async (ctx: BotContext) => {
      const wordId = +(ctx.match || [])[1];
      const page = +(ctx.match || [])[2];

      const [word] = await Promise.all([
        Word.findByPk(wordId, { include: [WordsCollection] }),
      ]);
      if (!(word && word.wordsCollection))
        return await ctx.answerCallbackQuery(ctx.t('u.error'));

      const kb = new InlineKeyboard()
        .text(
          word.repeating ? ctx.t('btn.repeating') : ctx.t('btn.not-repeating'),
          `goto:cwsr${wordId}_${page}_${word.repeating ? 0 : 1}`,
        )
        .text(ctx.t('btn.delete'), `goto:cwd${wordId}_${page}_0`)
        .row()
        .text(
          page ? ctx.t('btn.to-words-list') : ctx.t('btn.to-collection'),
          page
            ? `goto:cwl${word.wordsCollection.id}_${page}`
            : `goto:c${word.wordsCollection.id}`,
        );

      await ctx.editMessageText(
        appendUrl(
          ctx.t('u.msg-collection-word', {
            collectionName: html.escape(word.wordsCollection.name),
            word: html.escape(word.word),
            hint: html.escape(word.hint),
            repeatedCount: word.repeatedCount,
          }),
          word.photo,
        ),
        { reply_markup: kb },
      );
    };
    /** collection word */
    composer.callbackQuery(/goto:cw(\d+)_(\d+)/, collectionWordHandler);

    /** collection word set repeating */
    composer.callbackQuery(/goto:cwsr(\d+)_(\d+)_(\d+)/, async (ctx) => {
      const wordId = +(ctx.match || [])[1];
      // const page = +(ctx.match || [])[2];
      const repeating = !!+(ctx.match || [])[3];

      const word = await Word.findByPk(wordId);
      if (!word) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      await word.update({ repeating });
      await collectionWordHandler(ctx);
    });

    /** collection word delete */
    composer.callbackQuery(/goto:cwd(\d+)_(\d+)_(\d+)/, async (ctx) => {
      const wordId = +(ctx.match || [])[1];
      const page = +(ctx.match || [])[2];
      const confirm = !!+(ctx.match || [])[3];

      const word = await Word.findByPk(wordId);
      if (!word) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      if (!confirm) {
        return await ctx.editMessageText(
          ctx.t('u.delete-word-confirm', { word: word.word }),
          {
            reply_markup: new InlineKeyboard().text(
              ctx.t('btn.delete-confirm'),
              `goto:cwd${wordId}_${page}_1`,
            ),
          },
        );
      }

      const wordsCollectionId = word.wordsCollectionId;
      await word.destroy();

      await ctx.editMessageText(ctx.t('u.deleted-word'), {
        reply_markup: new InlineKeyboard().text(
          ctx.t('btn.to-the-ready-collection'),
          `goto:c${wordsCollectionId}`,
        ),
      });
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
              .text(ctx.t('btn.delete-confirm'), `goto:dc${collectionId}_1`)
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

    /** collection set repeating */
    composer.callbackQuery(/goto:csr(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const wordsCollectionId = +ctx.match[1];
      const repeating = !!+ctx.match[2];

      await Word.update({ repeating }, { where: { wordsCollectionId } });
      await ctx.answerCallbackQuery({
        text: ctx.t(
          repeating
            ? 'u.set-repeat-whole-collection'
            : 'u.set-dont-repeat-whole-collection',
        ),
        show_alert: true,
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

      const [
        wordsCollection,
        thisPageWords,
        userWordsCollections,
        totalWordsCnt,
      ] = await Promise.all([
        WordsCollection.findByPk(wordsCollectionId),
        Word.findAll({
          where: { wordsCollectionId },
          limit: Collections.MAX_WORDS_PER_PAGE,
          offset:
            Collections.MAX_WORDS_PER_PAGE * page -
            Collections.MAX_WORDS_PER_PAGE,
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

      const totalPagesCnt = Math.ceil(
        totalWordsCnt / Collections.MAX_WORDS_PER_PAGE,
      );

      if (totalPagesCnt > 1) {
        for (let n = 1; n <= totalPagesCnt; n++) {
          const text = n === page ? `[${n}]` : `${n}`;
          const data = `goto:rc${wordsCollectionId}_${n}`;

          if (
            n === 1 ||
            n === totalPagesCnt ||
            (n <= page + 2 && n >= page - 2)
          )
            kb.text(text, data);
        }
        kb.row();
      }

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
      const wordsCollectionId = +(ctx.match || [])[1];
      const page = +(ctx.match || [])[2];

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
          { name: collection.name, userId: ctx.dbUser.id },
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
      const page = +(ctx.match || [])[1];
      const wordId = +(ctx.match || [])[2];

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

      const maxBtnsPerLine = UserModule.getMaxBtnsPerLine(
        userCollections.length,
      );
      userCollections.forEach(({ id, name }, i) => {
        if (i && i % maxBtnsPerLine === 0) kb.row();
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
      const userCollectionId = +(ctx.match || [])[1];
      const wordId = +(ctx.match || [])[2];

      const word = await Word.findByPk(wordId);
      if (!word) return await ctx.answerCallbackQuery(ctx.t('u.error'));

      await Word.create({
        word: word.word,
        hint: word.hint,
        photo: word.photo,
        wordsCollectionId: userCollectionId,
      });

      const kb = new InlineKeyboard()
        .text(ctx.t(`btn.to-the-word`), `goto:cw${wordId}_0`)
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

  static wordsCollectionsMenuId = 'm.words-collections';
  static getWordsCollectionsMenu(readyCollectionsMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(Collections.wordsCollectionsMenuId, {
      autoAnswer: false,
    })
      .submenu(
        ctxt('u.ready-collections'),
        Collections.readyCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-ready-collections')),
      )
      .row()
      .dynamic(async (ctx, range) => {
        const userCollections = await ctx.dbUser.$get('wordsCollections');
        const maxBtnsPerLine = UserModule.getMaxBtnsPerLine(
          userCollections.length,
        );
        userCollections.forEach(({ id, name }, i) => {
          if (i && i % maxBtnsPerLine === 0) range.row();
          range.text({ text: name, payload: `goto:c${id}` });
        });
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-trainer')),
      )
      .text(ctxt('btn.create-collection'), (ctx) =>
        ctx.conversation.enter(Collections.createCollectionConversationId, {
          overwrite: true,
        }),
      );

    menu.register(readyCollectionsMenu);
    return menu;
  }

  private static readyCollectionsMenuId = 'm.ready-collections';
  static getReadyCollectionsMenu() {
    const menu = new Menu<BotContext>(Collections.readyCollectionsMenuId, {
      autoAnswer: false,
    })
      .dynamic(async (_, range) => {
        const collections = await WordsCollection.findAll({
          where: { isCommon: true },
        });
        const maxBtnsPerLine = UserModule.getMaxBtnsPerLine(collections.length);
        collections.forEach(({ id, name }, i) => {
          if (i && i % maxBtnsPerLine === 0) range.row();
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

  static createCollectionConversationId = 'create-collection';
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
        if (!(text && text.length <= 255)) {
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

  static editCollectionConversationId = 'edit-collection';
  /** !!! All Side-effects Must Be Wrapped !!! */
  static getEditCollectionConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      assert(ctx.match && +ctx.match[1]);
      const collectionId = +ctx.match[1];

      await ctx.editMessageText(ctx.t('u.send-collection-new-name'), {
        reply_markup: undefined,
      });

      let name = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 255)) {
          await ctx.reply(ctx.t('u.invalid-new-collection-name'));
          continue;
        }

        name = text;
      } while (!name);

      await conversation.external({
        task: () =>
          WordsCollection.update(
            {
              name,
            },
            { where: { id: collectionId } },
          ),
      });

      await ctx.reply(ctx.t('u.collection-edited'), {
        reply_markup: new InlineKeyboard().text(
          ctx.t(`btn.back`),
          `goto:c${collectionId}`,
        ),
      });
    };
  }
}
