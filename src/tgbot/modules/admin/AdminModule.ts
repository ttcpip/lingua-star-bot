import { Composer, InlineKeyboard } from 'grammy';
import {
  HomeWorkEntry,
  SettingsManager,
  StudyGroup,
  User,
} from '../../../database';
import { BotContext } from '../../BotContext';
import logger from '../../../logger';
import assert from 'assert';
import dedent from 'dedent';
import { html } from 'telegram-format/dist/source';
import { Op } from 'sequelize';
import { createConversation } from '@grammyjs/conversations';
import { BotConversation } from '../../BotConversation';
import { noop } from '../../../helpers';
import { Message } from 'grammy/out/platform.node';
import { DateTime } from 'luxon';

export class AdminModule {
  static getComposer(settingsManager: SettingsManager) {
    const composer = new Composer<BotContext>();

    composer.use(
      createConversation(
        AdminModule.getAddHomeWorkConversation(settingsManager),
        AdminModule.addHomeWorkConversationId,
      ),
    );
    composer.use(
      createConversation(
        AdminModule.getCreateStudyGroupConversation(),
        AdminModule.createStudyGroupConversationId,
      ),
    );
    composer.use(
      createConversation(
        AdminModule.getRenameStudyGroupConversation(),
        AdminModule.renameStudyGroupConversationId,
      ),
    );
    composer.use(
      createConversation(
        AdminModule.getStudyGroupMailingConversation(),
        AdminModule.studyGroupMailingConversationId,
      ),
    );

    composer.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        logger.error(`When processing admin chat message`, {
          update: ctx.update,
          err,
        });

        await ctx.reply(`Ошибка при обработке: ${(<Error>err).message}`);
      }
    });

    composer.callbackQuery(/:qc:/, async (ctx, next) => {
      ctx.conversation.exit();
      await next();
    });

    /** study group */
    composer.callbackQuery(/goto:a:sg(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const [gr, usersCount] = await Promise.all([
        StudyGroup.findByPk(grId),
        User.count({ where: { studyGroupId: grId } }),
      ]);
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);

      const inviteUrl = `t.me/${ctx.me.username}?start=sg_${grId}`;
      const kb = new InlineKeyboard()
        .text(`🔏 Удалить ДЗ`, `goto:a:rhw${grId}_0`)
        .text(`✍️ Добавить ДЗ`, `goto:a:ahw${grId}`)
        .row()
        .text(`👁 Посмотреть ДЗ`, `goto:a:whw${grId}`)
        .row()
        .url(
          `➕ Пригласить учеников`,
          `tg://msg_url?url=${encodeURIComponent(inviteUrl)}`,
        )
        .text(`👨‍🎓 Список учеников`, `goto:a:ssl${grId}`)
        .row()
        .text(`✏️ Переименовать группу`, `goto:a:rsg${grId}`)
        .text(`🗑 Удалить группу`, `goto:a:dsg${grId}_0`)
        .row()
        .text(`💬 Рассылка`, `goto:a:sgm${grId}`)
        .row()
        .text('⏪ К списку групп', `goto:a:sgs`);

      await ctx.editMessageText(
        dedent`
          Выбрана учебная группа: ${html.bold(html.escape(gr.name))}
          Учеников в группе: ${html.bold(`${usersCount}`)}
        `,
        { reply_markup: kb },
      );
    });

    /** remove homework */
    composer.callbackQuery(/goto:a:rhw(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const confirmed = !!+ctx.match[2];
      const gr = await StudyGroup.findByPk(grId);
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);

      if (!confirmed) {
        return await ctx.editMessageText(
          `Вы уверены, что хотите удалить домашнее задание для группы ${html.bold(
            html.escape(gr.name),
          )}`,
          {
            reply_markup: new InlineKeyboard()
              .text(`✔️ Да`, `goto:a:rhw${grId}_1`)
              .text(`🚫 Отмена`, `goto:a:sg${grId}`),
          },
        );
      }

      await HomeWorkEntry.destroy({ where: { studyGroupId: grId } });

      await ctx.editMessageText(
        `Домашнее задание для группы ${html.bold(
          html.escape(gr.name),
        )} успешно удалено`,
        { reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:sg${grId}`) },
      );
    });

    /** remove homework */
    composer.callbackQuery(/goto:a:ahw(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const gr = await StudyGroup.findByPk(grId);
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);

      await ctx.conversation.enter(AdminModule.addHomeWorkConversationId, {
        overwrite: true,
      });
    });

    /** watch homework */
    composer.callbackQuery(/goto:a:whw(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const gr = await StudyGroup.findByPk(grId, { include: [HomeWorkEntry] });
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);
      if (!(gr.homeWorkEntries && gr.homeWorkEntries.length > 0))
        return await await ctx.answerCallbackQuery(`Домашнего задания нет`);

      ctx
        .editMessageText(
          `✍️ Домашнее задание для группы ${html.bold(html.escape(gr.name))}`,
          { reply_markup: undefined },
        )
        .catch(noop);

      assert(ctx.chat);
      for (const el of gr.homeWorkEntries)
        await ctx.api.forwardMessage(ctx.chat.id, el.chatId, el.messageId);

      const datetime = DateTime.fromJSDate(gr.lastTimeSetHomeWork)
        .setZone(settingsManager.get().displayTimeZone)
        .setLocale('ru')
        .toFormat('d MMMM, HH:mm');
      await ctx.reply(`📝 Последнее обновление: ${datetime}`, {
        reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:sg${grId}`),
      });
    });

    /** students list */
    composer.callbackQuery(/goto:a:ssl(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const gr = await StudyGroup.findByPk(grId, { include: [User] });
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);
      if (!(gr.users && gr.users.length > 0))
        return await ctx.answerCallbackQuery(`В группе нет учеников`);

      const kb = new InlineKeyboard();
      const MAX_BTNS_PER_LINE =
        gr.users.length <= 5 ? 1 : gr.users.length <= 14 ? 2 : 3;
      gr.users.forEach(({ id, name }, i) => {
        if (i && i % MAX_BTNS_PER_LINE === 0) kb.row();
        kb.text(name, `goto:a:rs${grId}_${id}_0`);
      });
      kb.row().text(`⏪`, `goto:a:sg${grId}`);

      await ctx.editMessageText(
        `Выберите ученика для удаления из группы ${html.bold(
          html.escape(gr.name),
        )}`,
        { reply_markup: kb },
      );
    });

    /** remove student */
    composer.callbackQuery(/goto:a:rs(\d+)_(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const uId = +ctx.match[2];
      const confirmed = !!+ctx.match[3];
      const [gr, user] = await Promise.all([
        StudyGroup.findByPk(grId),
        User.findByPk(uId),
      ]);
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);
      if (!user) return await ctx.answerCallbackQuery(`Ученик не найден`);

      if (!confirmed) {
        return await ctx.editMessageText(
          `Вы уверены, что хотите удалить ученика ${html.bold(
            html.escape(user.name),
          )} из группы ${html.bold(html.escape(gr.name))}`,
          {
            reply_markup: new InlineKeyboard()
              .text(`✔️ Да`, `goto:a:rs${grId}_${uId}_1`)
              .text(`🚫 Отмена`, `goto:a:ssl${grId}`),
          },
        );
      }

      await user.update({ studyGroupId: null });
      await ctx.editMessageText(
        `Ученик ${html.bold(
          html.escape(user.name),
        )} успешно удален из группы ${html.bold(html.escape(gr.name))}`,
        { reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:ssl${grId}`) },
      );
    });

    /** rename study group */
    composer.callbackQuery(/goto:a:rsg(\d+)/, async (ctx) => {
      await ctx.conversation.enter(AdminModule.renameStudyGroupConversationId, {
        overwrite: true,
      });
    });

    /** delete group */
    composer.callbackQuery(/goto:a:dsg(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const grId = +ctx.match[1];
      const confirmed = !!+ctx.match[2];
      const gr = await StudyGroup.findByPk(grId);
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);

      if (!confirmed) {
        return await ctx.editMessageText(
          `Вы уверены, что хотите удалить группу ${html.bold(
            html.escape(gr.name),
          )}`,
          {
            reply_markup: new InlineKeyboard()
              .text(`✔️ Да`, `goto:a:dsg${grId}_1`)
              .text(`🚫 Отмена`, `goto:a:sg${grId}`),
          },
        );
      }

      await gr.destroy();
      await ctx.editMessageText(
        `Группа ${html.bold(html.escape(gr.name))} успешно удалена`,
        { reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:sgs`) },
      );
    });

    /** study group mailing */
    composer.callbackQuery(/goto:a:sgm(\d+)/, async (ctx) => {
      await ctx.conversation.enter(
        AdminModule.studyGroupMailingConversationId,
        { overwrite: true },
      );
    });

    const getStudyGroupsKbAndMsg = async () => {
      const [grs, usersWithGroupsCount] = await Promise.all([
        StudyGroup.findAll(),
        User.count({
          where: { studyGroupId: { [Op.not]: null } },
        }),
      ]);

      const msg = dedent`
        Всего учебных групп: ${html.bold(`${grs.length}`)}
        Всего учеников: ${html.bold(`${usersWithGroupsCount}`)}
      `;

      const kb = new InlineKeyboard();
      const MAX_BTNS_PER_LINE = grs.length <= 5 ? 1 : grs.length <= 14 ? 2 : 3;
      grs.forEach(({ id, name }, i) => {
        if (i && i % MAX_BTNS_PER_LINE === 0) kb.row();
        kb.text(name, `goto:a:sg${id}`);
      });
      kb.row().text(`➕ Создать учебную группу`, `goto:a:csg`);

      return { msg, kb };
    };

    /** study groups */
    composer.callbackQuery(/goto:a:sgs/, async (ctx) => {
      const { msg, kb } = await getStudyGroupsKbAndMsg();
      await ctx.editMessageText(msg, { reply_markup: kb });
    });
    composer.on('message', async (ctx) => {
      const { msg, kb } = await getStudyGroupsKbAndMsg();
      await ctx.reply(msg, { reply_markup: kb });
    });

    /** create study group */
    composer.callbackQuery(/goto:a:csg/, async (ctx) => {
      await ctx.conversation.enter(AdminModule.createStudyGroupConversationId, {
        overwrite: true,
      });
    });

    composer.on('callback_query', (ctx) => ctx.answerCallbackQuery('🤷‍♂️'));

    const composerOuter = new Composer<BotContext>();
    composerOuter.filter(
      (ctx: BotContext) => ctx.chat?.id === settingsManager.get().adminTgChatId,
      composer,
    );

    return composerOuter;
  }

  private static addHomeWorkConversationId = 'add-homework';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getAddHomeWorkConversation(settingsManager: SettingsManager) {
    return async (conversation: BotConversation, ctx: BotContext) => {
      assert(ctx.match);
      const grId = +ctx.match[1];

      assert(ctx.callbackQuery);
      await ctx.editMessageText(
        dedent`
          ✍️ Отправьте домашнее задание

          • Прошлое ДЗ будет удалено
          • Можно отправлять несколько сообщений
          • Поддерживаются любые типы вложений:
          • • Текст, фото, видео, аудио и так далее
        `,
        { reply_markup: new InlineKeyboard().text(`🚫 Отмена`) },
      );

      let i = 30;
      const hwMessages: Message[] = [];
      do {
        --i;
        const respCtx = await conversation.waitFor([
          'message',
          'callback_query',
        ]);

        if (respCtx.callbackQuery) {
          if (respCtx.callbackQuery.data === 'finish') {
            respCtx
              .editMessageReplyMarkup({ reply_markup: undefined })
              .catch(noop);
            break;
          }
          // Clicked cancel or any other btn
          const msg = ctx.callbackQuery.message || {
            text: '.',
            reply_markup: undefined,
          };
          await ctx.editMessageText(msg.text || '.', {
            reply_markup: msg.reply_markup,
          });
          return;
        }

        hwMessages.push(respCtx.message);
        ctx
          .reply(`Элемент домашнего задания зафиксирован`, {
            reply_markup: new InlineKeyboard().text(
              `✔️ Завершить добавление ДЗ`,
              'finish',
            ),
            reply_to_message_id: respCtx.message.message_id,
            allow_sending_without_reply: true,
          })
          .catch(noop);
      } while (i > 0);

      const hwChatId = await conversation.external({
        task: () => settingsManager.get().homeWorkTgChannelId,
      });
      const hwMessageIds: number[] = [];
      for (const msg of hwMessages) {
        const { message_id: sentMsgId } = await ctx.api.copyMessage(
          hwChatId,
          msg.chat.id,
          msg.message_id,
          msg,
        );
        hwMessageIds.push(sentMsgId);
      }

      await conversation.external({
        task: () => HomeWorkEntry.destroy({ where: { studyGroupId: grId } }),
      });
      await conversation.external({
        task: () =>
          HomeWorkEntry.bulkCreate(
            hwMessageIds.map((messageId) => ({
              studyGroupId: grId,
              chatId: hwChatId,
              messageId,
            })),
          ),
      });
      await conversation.external({
        task: () =>
          StudyGroup.update(
            { lastTimeSetHomeWork: DateTime.local().toJSDate() },
            { where: { id: grId } },
          ),
      });

      await ctx.reply(`Домашнее задание успешно добавлено`, {
        reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:sg${grId}`),
      });
    };
  }

  private static createStudyGroupConversationId = 'create-group';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getCreateStudyGroupConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      await ctx.editMessageText(`✍️ Отправьте имя для новой учебной группы`, {
        reply_markup: new InlineKeyboard().text(`🚫 Отмена`, `:qc:goto:a:sgs`),
      });

      let name = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 256)) {
          await ctx.reply(`Некорректное имя`);
          continue;
        }

        name = text;
      } while (!name);

      const { id: createdId } = await conversation.external({
        task: () =>
          StudyGroup.create({
            name,
            lastTimeSetHomeWork: new Date(0),
          }),
      });

      await ctx.reply(
        `Учебная группа ${html.bold(html.escape(name))} успешно создана`,
        {
          reply_markup: new InlineKeyboard()
            .text(`⏪ К созданной группе`, `goto:a:sg${createdId}`)
            .row()
            .text(`⏪ К списку групп`, `goto:a:sgs`),
        },
      );
    };
  }

  private static renameStudyGroupConversationId = 'rename-group';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getRenameStudyGroupConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      assert(ctx.match);
      const grId = +ctx.match[1];

      await ctx.editMessageText(`✍️ Отправьте новое имя для учебной группы`, {
        reply_markup: new InlineKeyboard().text(
          `🚫 Отмена`,
          `:qc:goto:a:sg${grId}`,
        ),
      });

      let name = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 256)) {
          await ctx.reply(`Некорректное имя`);
          continue;
        }

        name = text;
      } while (!name);

      await conversation.external({
        task: () => StudyGroup.update({ name }, { where: { id: grId } }),
      });

      await ctx.reply(
        `Учебная группа переименована в ${html.bold(html.escape(name))}`,
        { reply_markup: new InlineKeyboard().text(`⏪`, `goto:a:sg${grId}`) },
      );
    };
  }

  private static studyGroupMailingConversationId = 'group-mailing';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getStudyGroupMailingConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      assert(ctx.match);
      assert(ctx.chat);
      const grId = +ctx.match[1];
      const gr = await conversation.external({
        task: () => StudyGroup.findByPk(grId, { include: [User] }),
      });
      if (!gr) return await ctx.answerCallbackQuery(`Группа не найдена`);
      if (!(gr.users && gr.users.length > 0))
        return await ctx.answerCallbackQuery(`В группе нет учеников`);

      await ctx.editMessageText(
        dedent`
          ✍️ Отправьте сообщение для рассылки всем ученикам группы ${html.bold(
            html.escape(gr.name),
          )}
          Учеников в группе: ${gr.users.length}
        `,
        {
          reply_markup: new InlineKeyboard().text(
            `🚫 Отмена`,
            `:qc:goto:a:sg${grId}`,
          ),
        },
      );

      let flag = false;
      do {
        const mailingMsg = await conversation.waitFor('message');
        if (!flag)
          ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(noop);
        flag = true;

        await mailingMsg.copyMessage(ctx.chat.id);
        const confirmMsg = await ctx.reply(
          `👆 Это сообщение будет разослано всем ученикам`,
          {
            reply_markup: new InlineKeyboard()
              .text(`✔️ Верно`, 'confirm')
              .row()
              .text(`✏️ Изменить сообщение`, 'edit')
              .row()
              .text(`🚫 Отмена`, `:qs:goto:a:sg${grId}`),
          },
        );

        const { callbackQuery: r } = await conversation.waitUntil(
          (ctx) =>
            ctx.callbackQuery?.data === 'confirm' ||
            ctx.callbackQuery?.data === 'edit',
        );
        confirmMsg.editReplyMarkup({ inline_keyboard: [] }).catch(noop);
        if (r?.data === 'edit') {
          await ctx.reply(`Отправьте новое сообщение для рассылки`);
          continue;
        }
        if (r?.data === 'confirm') {
          let sentCnt = 0;
          for (const user of gr.users) {
            try {
              await mailingMsg.copyMessage(user.tgid);
              ++sentCnt;
            } catch (err) {
              await ctx.reply(
                dedent`
                  Не удалось отправить сообщение ученику ${user.name}:
                  ${(<Error>err).message || ''}
                `,
              );
            }
          }
          await ctx.reply(dedent`
            ✅ Рассылка завершена
            Отправлено сообщений: ${sentCnt}
          `);
        }

        return; // сюда код не должен никогда дойти
        // eslint-disable-next-line no-constant-condition
      } while (true);
    };
  }
}
