#
# Errors:
err =
  .error = ❗️ Error, try again later
  .no-collections = ❗️ You have no collections. Create one and try to add words again
  .group-not-found = ❗️ Group not found
  .collection-not-found = ❗️ Collection not found
  .no-word-found = ❗️ Word not found, try again
  .no-words-in-collection = ❗️ No words in the collection
  .invalid-name = ❗️ Incorrect name given
  .invalid-new-collection-name = ❗️ Incorrect collection name given
  .select-from-btns-below = ❗️ Select button from the list below
  
#
# Buttons:
btn =
  .words-trainer = 🧠 Words trainer
  .homework = ✍️ Homework
  .edu-materials = 📚 Educational materials
  .settings = ⚙️ Settings
  .change-lang = Change language
  .edit-name = Edit name

  .revise-words = 🔄 Revise words
  .search-words = 🔎 Your words search
  .add-word = 💬 Add word
  .words-collections = 📘 Word collections
  .ready-collections = 📝 Ready collections
  
  .add-whole-collection = Add whole collection
  .back = ⏪ Back
  .cancel = 🚫 Cancel
  .to-main-menu = ⏪ To the main menu
  .to-words-list = ⏪ To the words list
  .to-collection = ⏪ To the collection
  .to-the-word = 🔗 To the word
  .to-the-ready-collection = ⏪ Back to the collection
  .create-collection = ➕ Create
  .collection-words-list = 📗 Words list
  .delete = ❌ Delete
  .delete-confirm = 🗑 Sure
  .edit-collection = ✏️ Edit
  .textbooks = 📔 Textbooks
  .cheat-sheets = 😼 Cheat Sheets
  .dictionaries = 📝 Dictionaries
  .phrasebooks = 💬 Phrasebooks

  .tenses = ⏳ Tenses
  .irr-verbs = Irregular verbs
  .modal-verbs = Modal verbs
  .prepositions-of-place = Prepositions of place
  .prepositions-of-time = Prepositions of time
  .irr-nouns = Irregular nouns
  .direct-indirect-speech = Direct/Indirect speech
  .colors = Colors

  .repeating = ✔️ Revises
  .not-repeating = ✖️ Doesn't revise
  .repeat-whole-collection = ✔️ Revise all words
  .dont-repeat-whole-collection = ✖️ Don't revise all words
  .share-collection = 🔗 Share collection
  .remember = ✅ Remember
  .dont-remember = ❌ Don't remember
  .show-hint = 🗣 Show hint
  .show-photo = 🖼 Show photo
  .finish = 🚫 Finish

#
# Common stuff:
common =
  .remember-symbol = ✅
  .dont-remember-symbol = ❌

#
# Messages:
msg =
  .main-menu = {"️ㅤ"}
  .settings =
    <b>{btn.settings}</b>

    Language: <i>English</i>
    Name: <i>{$name}</i>

  .homework = <b>{btn.homework}:</b>
  .homework-last-update = 📝 Last updated: <i>{$datetime}</i>
  .no-study-group = ❗️ You aren't in any study group. Contact the administrator
  .no-homework = 📗 No homework
  .send-new-name = ✏️ Send new name
  .words-trainer = <b>{btn.words-trainer}</b>
  .words-collections = <b>{btn.words-collections}</b>
  .ready-collections = <b>{btn.ready-collections}</b>
  .ready-collection =
    <b>{btn.ready-collections}</b>
    Selected: <i>{$name}</i>
    Words in the collection: <i>{$wordsCount}</i>

    • Click the word to add it
    • If the word is already added - ✔️
  .ready-collection-word =
    <b>{btn.ready-collections}</b>
    Selected collection: <i>{$collectionName}</i>
    Selected word: <i>{$word}</i>
    Hint: <i>{$hint}</i>

    Select your collection to add word
  .ready-collection-word-added = ✅ Word added
  .collection =
    <b>{btn.words-collections}</b>
    Selected collection: <i>{$name}</i>
    Words in the collection: <i>{$wordsCount}</i>

    Now revising: <i>{$repeatingWordsCount}</i>
    Not revising: <i>{$notRepeatingWordsCount}</i>
  .collection-word-list = <b>{btn.collection-words-list}</b>
  .collection-word =
    Word: <i>{$word}</i>
    Collection: <i>{$collectionName}</i>
    Hint: <i>{$hint}</i>

    Word revises: <i>{$repeatedCount}</i>

  .joined-study-group = ✅ You've successfully joined <b>{$name}</b> study group

  .add-words = 
    <b>{btn.add-word}</b>

    Select the collection to add word to

  .send-word = 
    <b>{btn.add-word}</b>

    Send message in the format:

    Word or phrase
    -
    Hint
    -
    Photo URL (optional)
  .invalid-word = ❗️ Invalid word
  .invalid-hint = ❗️ Invalid hint
  .invalid-photo = ❗️ Invalid photo
  .added-word = ✅ Successfully added word <b>{$word}</b>
  .search-word =
    🔎 Write word or phrase to search
    
    You can use <b>%</b> symbol (will find any character)
  .nothing-found =
    ❗️ Nothing found
    
    Try something else

  .search-result = 🔍 Search result:
  .edu-materials = <b>{btn.edu-materials}</b>
  .revise-word = ❓ Word: <b>{$word}</b>
  .revise-word-with-hint =
    ❓ Word: <b>{$word}</b>
    Hint: <b>{$hint}</b>
  
  .collection-added = ✅ Collection added
  .shared-collection-added = ✅ Collection <b>{$name}</b> added
  .send-new-collection-name = ✏️ Send name for new collection
  .collection-created = ✅ Collection created
  .send-collection-new-name = ✏️ Send new name for the collection
  .collection-edited = ✅ Collection edited

  .delete-collection-confirm =
    ❗️ Collection deleting <b>{$name}</b>
    Words in the collection: <b>{$wordsCount}</b>

    It's impossible to restore after deleting
  .deleted-collection = ✅ Коллекция успешно удалена
  .delete-word-confirm =
    ❗️ Word deleting <b>{$word}</b>

    It's impossible to restore after deleting
  .deleted-word = ✅ Слово успешно удалено
  .set-repeat-whole-collection = ✔️ All the collection words been added for revising
  .set-dont-repeat-whole-collection = ✖️ All the collection words been removed from revising
  .now-repeating-word = ✔️ Word {$word} successfully added for revising
  .now-dont-repeating-word = ✖️ Word {$word} successfully been removed from revising
  