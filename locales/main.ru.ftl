#
# Errors:
err =
  .error = ❗️ Ошибка, попробуйте позже
  .no-collections = ❗️ У Вас нет ни одной коллекции слов. Создайте её и попробуйте добавить слово снова
  .group-not-found = ❗️ Группа не найдена
  .collection-not-found = ❗️ Коллекция не найдена
  .no-word-found = ❗️ Слово не найдено, попробуйте снова
  .no-words-in-collection = ❗️ В коллекции нет слов
  .invalid-name = ❗️ Некорректно введено имя
  .invalid-new-collection-name = ❗️ Некорректно введено имя
  .select-from-btns-below = ❗️ Выберите кнопку из списка ниже
  
#
# Buttons:
btn =
  .words-trainer = 🧠 Тренажер слов
  .homework = ✍️ Домашнее задание
  .edu-materials = 📚 Учебные материалы
  .settings = ⚙️ Настройки
  .change-lang = Сменить язык
  .edit-name = Редактировать имя

  .revise-words = 🔄 Повторять слова
  .search-words = 🔎 Поиск своих слов
  .add-word = 💬 Добавить слово
  .words-collections = 📘 Коллекции слов
  .ready-collections = 📝 Готовые коллекции
  
  .add-whole-collection = Добавить всю коллекцию
  .back = ⏪ Назад
  .cancel = 🚫 Отмена
  .to-main-menu = ⏪ В главное меню
  .to-words-list = ⏪ К списку слов
  .to-collection = ⏪ К коллекции
  .to-the-word = 🔗 К слову
  .to-the-ready-collection = ⏪ Обратно к коллекции
  .create-collection = ➕ Создать
  .collection-words-list = 📗 Список слов
  .delete = ❌ Удалить
  .delete-confirm = 🗑 Уверен
  .edit-collection = ✏️ Редактировать
  .textbooks = 📔 Учебники
  .cheat-sheets = 😼 Шпаргалки
  .dictionaries = 📝 Словари
  .phrasebooks = 💬 Разговорники

  .tenses = ⏳ Времена
  .irr-verbs = Неправильные глаголы
  .modal-verbs = Модальные глаголы
  .prepositions-of-place = Предлоги места
  .prepositions-of-time = Предлоги времени
  .irr-nouns = Неправильные существительные
  .direct-indirect-speech = Прямая/косвенная речь
  .colors = Цвета

  .repeating = ✔️ Повторяется
  .not-repeating = ✖️ Не повторяется
  .repeat-whole-collection = ✔️ Повторять все слова
  .dont-repeat-whole-collection = ✖️ Не повторять все слова
  .share-collection = 🔗 Поделиться коллекцией
  .remember = ✅ Помню
  .dont-remember = ❌ Не помню
  .show-hint = 🗣 Показать подсказку
  .show-photo = 🖼 Показать фото
  .finish = 🚫 Завершить

#
# Common stuff:
common =
  .remember-symbol = ✅
  .dont-remember-symbol = ❌

#
# Messages:
msg =
  .main-menu = {"ㅤ"}
  .settings =
    <b>{btn.settings}</b>

    Язык: <i>Русский</i>
    Имя: <i>{$name}</i>

  .homework = <b>{btn.homework}:</b>
  .homework-last-update = 📝 Последнее обновление: <i>{$datetime}</i>
  .no-study-group = ❗️ Вы не находитесь в какой-либо учебной группе. Свяжитесь с администратором
  .no-homework = 📗 Домашнее задание отсутствует
  .send-new-name = ✏️ Отправьте новое имя
  .words-trainer = <b>{btn.words-trainer}</b>
  .words-collections = <b>{btn.words-collections}</b>
  .ready-collections = <b>{btn.ready-collections}</b>
  .ready-collection =
    <b>{btn.ready-collections}</b>
    Выбрано: <i>{$name}</i>
    Слов в коллекции: <i>{$wordsCount}</i>

    • Нажми на слово, чтобы добавить его
    • Если слово уже добавлено - ✔️
  .ready-collection-word =
    <b>{btn.ready-collections}</b>
    Выбрана коллекция: <i>{$collectionName}</i>
    Выбрано слово: <i>{$word}</i>
    Подсказка: <i>{$hint}</i>

    Выберите свою коллекцию для добавления слова
  .ready-collection-word-added = ✅ Слово добавлено
  .collection =
    <b>{btn.words-collections}</b>
    Выбрана коллекция: <i>{$name}</i>
    Слов в коллекции: <i>{$wordsCount}</i>

    Из них сейчас повторяется: <i>{$repeatingWordsCount}</i>
    Не повторяется: <i>{$notRepeatingWordsCount}</i>
  .collection-word-list = <b>{btn.collection-words-list}</b>
  .collection-word =
    Слово: <i>{$word}</i>
    Коллекция: <i>{$collectionName}</i>
    Подсказка: <i>{$hint}</i>

    Кол-во повторов слова: <i>{$repeatedCount}</i>

  .joined-study-group = ✅ Вы успешно вступили в учебную группу <b>{$name}</b>

  .add-words = 
    <b>{btn.add-word}</b>

    Выберите коллекцию, в которой хотите создать слово

  .send-word = 
    <b>{btn.add-word}</b>

    Отправьте сообщение в следующем формате:

    Слово или фраза
    -
    Подсказка
    -
    Ссылка на фото (не обязательно)
  .invalid-word = ❗️ Некорректно введено слово
  .invalid-hint = ❗️ Некорректно введена подсказка
  .invalid-photo = ❗️ Некорректно введено фото
  .added-word = ✅ Слово <b>{$word}</b> успешно добавлено
  .search-word =
    🔎 Введите слово или фразу для поиска 
    
    Можно использовать символ <b>%</b> (примет любой символ)
  .nothing-found =
    ❗️ Поиск не дал результата
    
    Введите другое слово или фразу для поиска

  .search-result = 🔍 Результат поиска:
  .edu-materials = <b>{btn.edu-materials}</b>
  .revise-word = ❓ Слово: <b>{$word}</b>
  .revise-word-with-hint =
    ❓ Слово: <b>{$word}</b>
    Подсказка: <b>{$hint}</b>
  
  .collection-added = ✅ Коллекция добавлена
  .shared-collection-added = ✅ Коллекция <b>{$name}</b> добавлена
  .send-new-collection-name = ✏️ Отправьте имя для новой коллекции
  .collection-created = ✅ Коллекция создана
  .send-collection-new-name = ✏️ Отправьте новое имя для коллекции
  .collection-edited = ✅ Коллекция отредактирована

  .delete-collection-confirm =
    ❗️ Удаление коллекции <b>{$name}</b>
    Слов в коллекции: <b>{$wordsCount}</b>

    Восстановление после удаления невозможно
  .deleted-collection = ✅ Коллекция успешно удалена
  .delete-word-confirm =
    ❗️ Удаление слова <b>{$word}</b>

    Восстановление после удаления невозможно
  .deleted-word = ✅ Слово успешно удалено
  .set-repeat-whole-collection = ✔️ Все слова коллекции были включены в повторение
  .set-dont-repeat-whole-collection = ✖️ Все слова коллекции были исключены из повторения
  .now-repeating-word = ✔️ Слово {$word} успешно добавлено к повторению
  .now-dont-repeating-word = ✖️ Слово {$word} успешно удалено из повторения
  