import env from '../env';
import { Database, Word, WordsCollection } from '../database';
import logger from '../logger';

const db = new Database({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_DB,
  pool: {
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
    acquire: env.DATABASE_POOL_ACQUIRE,
    idle: env.DATABASE_POOL_IDLE,
    evict: env.DATABASE_POOL_IDLE,
  },
  logging: env.SEQUELIZE_LOGGER,
});

async function main() {
  await db.init();

  const collections = getData();
  for (const collectionName in collections) {
    const collectionWords = collections[collectionName];

    const createdCollection = await WordsCollection.create({
      name: collectionName,
      isCommon: true,
    });
    logger.info(`Created collection: ${collectionName}`);

    await Word.bulkCreate(
      collectionWords.map(([word, hint]) => ({
        word,
        hint,
        photo: '',
        wordsCollectionId: createdCollection.id,
        repeating: false,
      })),
    );
    logger.info(
      `Added ${collectionWords.length} words to collection: ${collectionName}`,
    );
  }

  logger.info(`Done`);
  process.exit(0);
}

main().catch((err) => {
  logger.error(`Fatal error: `);
  logger.error(err);
  logger.error(`Terminating the app...`);
  process.exit(1);
});

function getData() {
  const collections: Record<string, Array<Array<string>>> = {
    Descriptions: [
      ['Pointless', 'Бессмысленный;  having no purpose'],
      ['Itchy', 'Зудящий; scratchy, annoying'],
      ['Weird', 'Странный; odd, strange, unusual'],
      ['Proposed', 'Предложенный; suggested, offered'],
      ['Lame', 'Убогий, хромой; unable to walk, weak'],
      ['Fair', 'Справедливый, честный; right, reasonable'],
      ['Dying', 'Умирающий; very ill, likely to die soon'],
      ['Wet', 'Мокрый; covered with water or liquid'],
      ['Honest', 'Честный; telling the truth, trustworthy'],
      ['Handy', 'Удобный; useful or convenient'],
      ['Dry', 'Сухой; having no water on, in or around it'],
      [
        'Bad - worse -  the worst',
        'Плохой - хуже - худший; unpleasant, not good',
      ],
      ['Explicit', 'Явный, точный; clear, exact'],
      ['Weak', 'Слабый; not physically or morally strong'],
      ['Sober', 'Трезвый; not drunk'],
      ['Hungry', 'Голодный; wanting or needing food'],
      [
        'Remaining',
        'Оставшийся; continuing to exist, left when other parts have been used, what was left',
      ],
      ['Deaf', 'Глухой; unable to hear'],
      ['Advanced', 'Продвинутый, передовой; modern, well developed'],
      ['Prime', 'Основной, главный; main, most important'],
      [
        'High-impact',
        'Высоко эффективный, ударопрочный; able to  affect or influence, unlikely to break',
      ],
      ['Latest', 'Самый последний, свежий; newest, most recent'],
      ['Adjacent', 'Примыкающий, смежный; very close, next to, touching'],
      ['Smug', 'Самодовольный; too pleased or satisfied with yourself'],
      ['Intercepted', 'Прерванный, перехваченный; stopped and caught'],
      ['Volatile', 'Летучий, изменчивый; unstable, likely to change'],
      ['Certain', 'Определенный, конкретный; having no doubt, sure'],
      ['Difficult', 'Трудный; needing skills or effort'],
      ['Occurring', 'Происходящий; happening'],
      ['Consigned', 'Отправленный; sent'],
      ['Strapped', 'Стесненный в средствах; not having enough money'],
      ['Devised', 'Изобретенный; invented'],
      ['Necessary', 'Необходимый; needed, vital'],
      ['Brave', 'Храбрый; fearless, courageous'],
      ['Least', 'Наименьший; smallest'],
      ['Approximate', 'Приблизительный'],
      ['Brief', 'Краткий, недолгий; lasting a short time'],
      ['Tall', 'Высокий; of more than average height'],
      ['Respiratory', 'Дыхательный; related with breathing'],
      ['Terrible', 'Ужасный; very unpleasant or of a very bad quality'],
    ],
    Actions: [
      [
        'Bleach',
        'Отбеливать; to remove the colour from something or make it lighter',
      ],
      [
        'Unveil',
        'Открывать, раскрывать; make something known for the first time',
      ],
      [
        'Rely on/upon',
        'Полагаться, рассчитывать; looking for help or support to succeed',
      ],
      [
        'Smear',
        'Мазать, смазывать; to spread a liquid or a thick substance over a surface',
      ],
      ['Wear', 'Надевать, носить; to have clothing or jewels on your body'],
      [
        'Augment',
        'Дополнять; to increase size or value of smth by adding smth to it',
      ],
      [
        'Hurt',
        'Ранить, причинять боль; to feel pain in a boy part, injure someone, cause them pain',
      ],
      [
        'Influence',
        'Влиять; to affect or change how someone or something develops, behaves, or thinks',
      ],
      [
        'Pretend',
        'Притворяться, делать вид; fake, deceive, behave as if smth is true when it’s not',
      ],
      [
        'Conduct',
        'Вести, проводить, руководить; to organize and perform a particular activity',
      ],
      [
        'Prefer',
        'Предпочитать; to like, choose, or want one thing rather than another',
      ],
      [
        'Underestimate',
        'Недооценивать; to fail to guess or understand the real size, difficulty, etc. of something',
      ],
      [
        'Swear',
        'Клясться, неприлично ругаться; to use words that are rude or offensive, to promise or say firmly that you are telling the truth',
      ],
      [
        'Preen',
        'Прихорашиваться; to make yourself attractive and good looking',
      ],
      [
        'Ensure',
        'Обеспечивать, гарантировать; to make something certain to happen',
      ],
      [
        'Suppose',
        'Предполагать, полагать; to think that smth is likely to be true',
      ],
      [
        'Heal',
        'Лечить, исцелять; become well again (after illness or injury), when smth bad  improves or ends it heals',
      ],
      [
        'Be aware',
        'Знать, быть осведомленным; to know that something exists, to have a particular knowledge',
      ],
      [
        'Adjust',
        'Регулировать, приспосабливать; make slight changes to make smth correct or suitable',
      ],
      [
        'Play hooky',
        'Прогуливать; to stay away from school without permission',
      ],
      [
        'Defy',
        'Бросать вызов, игнорировать; to refuse to obey a person, decision, law, situation',
      ],
      ['Wipe', 'Протирать; remove liquid or dirt with a piece of cloth'],
      ['Wash', 'Мыть, стирать; to clean something using water'],
      [
        'Swim',
        'Плавать, плыть;  to move through water by moving the body parts',
      ],
      [
        'Crawl',
        'Ползать, ползти; to move slowly along the ground or on hands and knees',
      ],
      [
        'Decide',
        'Решать, принимать решение; choose one of several possibilities after thinking carefully',
      ],
      [
        'Refuse',
        'Отказываться, отвергать; to say that you will not do or accept something',
      ],
      ['Buy', 'Покупать, купить; to get something by paying money for it'],
      [
        'Worth',
        'Стоить, быть достойным; having a particular value, especially in money',
      ],
      [
        'Consist (of)',
        'Состоять (из чего-либо); to be made of or formed from something',
      ],
      ['Snooze', 'Дремать; to sleep lightly for a short time'],
      [
        'Celebrate',
        'Праздновать, справлять; having  special enjoyable activities on a particular occasion',
      ],
      [
        'Interact',
        'Взаимодействовать, влиять друг на друга; cooperate, to communicate with or react to',
      ],
      [
        'Convey',
        'Передавать, сообщать; to express a thought, feeling, or idea clearly so it’s understood',
      ],
      [
        'Improve',
        'Улучшать, совершенствовать; to cause smth get better, make smth better',
      ],
      [
        'Pray',
        'Молиться, просить; to speak to a god, hope for smth very much, to plead',
      ],
      ['Shine', 'Сиять, блистать; to send out or reflect light'],
      ['Hurry', 'Торопиться; do things more quickly than normal, be in a rush'],
      ['Measure', 'Измерять; to discover the size or amount of smth'],
      [
        'Stagnate',
        'Застаиваться, бездействовать; to stay the same, not develop',
      ],
    ],
    'Processes and qualities': [
      ['Vacation', 'Отпуск; time without work or school to relax'],
      ['Slumber', 'Дремота, сон; sleep'],
      ['Flare', 'Вспышка; flash, burn brightly for short time'],
      ['Noise', 'Шум; loud mostly unpleasant sound'],
      ['Asshole', 'Мудак; unpleasant stupid person'],
      ['Mess', 'Беспорядок; disorder, chaos'],
      [
        'Ass',
        'Осел, тупица, задница; donkey, stupid person, body part you sit on',
      ],
      ['Essence', 'Сущность; basic, most important idea or quality'],
      ['Nightmare', 'Кошмар, страшный сон; bad, scary dream'],
      ['Justice', 'Правосудие, справедливость; fairness'],
      ['Impact', 'Влияние, воздействие; force of hitting, powerful effect'],
      [
        'Approach',
        'Подход, приближение, доступ; way of doing smth, process of getting closer, access',
      ],
      ['Badass', 'Задира; bad, a bit frightening person'],
      ['Aim', 'Цель; goal, something to achieve'],
      ['Rush', 'Спешка; situation when you need to hurry, do smth quickly'],
      ['Chase', 'Погоня; being in a hurry trying to catch smb'],
      [
        'Favor',
        'Одолжение, услуга, благосклонность; approval, support, help in smth',
      ],
      ['Amends', 'Возмещение; doing smth good to show you’re sorry'],
      ['Figment', 'Вымысел, фикция; fake, smth that only seems real'],
      [
        'Spread',
        'Распространение; growing and affecting more or covering larger area',
      ],
      ['Amateur', 'Любитель; non-professional, doing smth for fun, pleasure'],
      ['Fete', 'Праздник, фестиваль; public event, festival'],
      ['Effort', 'Усилие, попытка; physical or mental activity to do smth'],
      [
        'Span',
        'Диапазон, интервал; time period while something exists or happens',
      ],
      [
        'Bounty',
        'Щедрость, премия; reward, great kindness, willing to give, plenty',
      ],
      ['Purpose', 'Цель; reason to do smth'],
      ['Praise', 'Похвала; expression of admiration and approval'],
      [
        'Insurance',
        'Страховка; an agreement with a company that pays you money in case of accident',
      ],
      [
        'Capacity',
        'Вместимость, мощность; total amount that can be contained or produced',
      ],
      [
        'Benefit',
        'Выгоды, пособие, польза; use, helpful or good effect, advantage',
      ],
    ],
    Feelings: [
      ['Excitement', 'Восторг, возбуждение; enthusiasm, exhilaration'],
      ['Anger', 'Гнев, злость; rage, being unkind'],
      ['Regret', 'Сожаление, густь; feeling sad about past events'],
      [
        'Joy',
        'Наслаждение, огромное счастье; great happiness, something that makes you happy',
      ],
      ['Greed', 'Жадность, желание большего; wish for more of something'],
      [
        'Jealousy',
        'Зависть, ревность; anger for someone who has something that you want',
      ],
      [
        'Impress',
        'Впечатлять, произвести впечатление; cause someone’s respect',
      ],
      [
        'Adore',
        'Восхищаться, любить+ценить+уважать; love+admire+respect, worship',
      ],
      ['Afraid', 'Бояться, переживать; feel fear for something bad can happen'],
      ['Nervous', 'Нервный, на иголках; worried'],
      ['Tranquil', 'Спокойный, умиротворенный; calm, balanced'],
      ['Cheerful', 'Радостный, довольный; happy, positive'],
      ['Respect', 'Уважение; admiration for someone’s qualities'],
      [
        'Disgust',
        'Отвращение,  сильное неприятие; disapproval, strong dislike',
      ],
      [
        'Indolent',
        'Индифферентный, безучастный; lazy, not enthusiastic, showing no interest',
      ],
      ['Bored', 'Скучающий; feel uninterested, unenthusiastic, tired'],
      ['Glad', 'Радостный, довольный; joyous, cheery, merry'],
      [
        'Suspense',
        'Неопределенность, напряженное ожидание; excitement or nervousness when waiting for something uncertain to happen',
      ],
      [
        'Remorse',
        'Раскаяние, сожаление; regret, being sorry for something you have done',
      ],
      [
        'Neglect',
        'Пренебрегать; ignore, disregard, to not give enough care or attention',
      ],
      ['Tired', 'Уставший, усталый; in need of rest'],
      ['Insane', 'Невменяемый, душевнобольной; mental ill'],
      [
        'Proud',
        'Гордый; feeling satisfaction for you or someone connected to you have done smth good',
      ],
      ['Decent', 'Приличный, порядочный; socially acceptable or good'],
      [
        'Temper',
        'Темперамент, характер, нрав; the tendency to become angry very quickly',
      ],
      [
        'Arousal',
        'Пробуждение, возбуждение; the causing of strong feelings or excitement in someone',
      ],
      ['Convinced', 'Убежденный, dedicated, certain of your beliefs'],
      [
        'Independent',
        'Независимый, самостоятельный; not influenced or controlled in any way by anything',
      ],
    ],
    'In the house': [
      ['Kitchen', 'Кухня, готовить там; cooking'],
      ['Doorstep', 'Порог, переступить при входе; step over'],
      ['Mirror', 'Зеркало, отражает; look at yourself, reflecting glass'],
      ['Fridge', 'Холодильник, там еда; food is there'],
      ['Bathroom', 'Ванна, мыться там; wash, shower'],
      ['Sofa, couch', 'Диван, лежать на нем; long soft chair'],
      ['Wardrobe', 'Платяной шкаф, там одежда; store the clothes there'],
      ['Dishwasher', 'Посудомоечная машина, моет посуду; washes plates, cups'],
      ['Bed linen', 'Постельное белье; sheets and covers for a bed'],
      ['Bookcase', 'Книжный шкаф, в нем хранить книг; shelves with books'],
      ['Remote control (remote)', 'Пульт, включает телевизор; turns on TV'],
      ['Hanger', 'Вешалка, на это вешать одежду; is used to hang clothes'],
      ['Curtain', 'Занавеска, закрывает окно; hangs across a window'],
      ['Stove', 'Плита, на ней готовить; cooker, hot surface to cook food'],
      [
        'Vacuum cleaner',
        'Пылесос, для уборки пыли; to clean the floor with it, sucks the dust up',
      ],
      ['Laptop', 'Ноутбук; portable computer'],
      ['Trash can', 'Мусорное ведро; throw garbage there'],
      ['Towel', 'Полотенце, им вытираются; to wipe yourself after shower'],
      ['Toothbrush', 'Зубная щетка, ей чистят зубы; clean teeth with it'],
      [
        'Pets',
        'Домашние животные, котики-песики; doggies-kitties, home kept animals',
      ],
      ['Bowl', 'Миска, глубокая тарелка; deep dish'],
      ['Sink / wash basin', 'Раковина, мыть в ней руки; wash hands in it'],
      ['Ceiling', 'Потолок, напротив пола; inside the house above your head'],
      [
        'Carpet',
        'Ковер, висит на стене в бабушкиной квартире; covers the floor',
      ],
      ['Rug, mat', 'Коврик, лежит на полу при входе, в ванной; small carpet'],
    ],
    Nouns: [
      ['Lip', 'Губа; red edges of one’s mouth'],
      ['Maid', 'Служанка, дева, горничная; girl-servant, young woman'],
      ['Boat', 'Лодка; small water vehicle'],
      ['Beard', 'Борода; facial hair, hair on the lower part of face'],
      [
        'Gemini',
        'Близнецы (знак Зодиака); group of stars which represent twins',
      ],
      [
        'Shirt',
        'Рубашка; clothes for the upper part of body with collar and buttons in front',
      ],
      ['Half', 'Половина; 50%, one of two equal parts'],
      ['Dude', 'Чувак; man, guy'],
      [
        'Estate',
        'Поместье, имущество; large piece of land belonging to a family',
      ],
      ['Judge', 'Судья; in court decides if one is guilty or innocent'],
      [
        'Nurse',
        'Медсестра; person who works in hospital and take care of ill people',
      ],
      [
        'T-shirt',
        'Футболка; shirt without collar and buttons and with short sleeves',
      ],
      ['Trousers', 'Брюки; clothes that cover ass and legs from waist to feet'],
      [
        'Wipe',
        'Салфетки; a piece of soft, wet cloth or paper that you use for wiping',
      ],
      ['Smell', 'Запах; aroma, quality you can feel with your nose'],
      [
        'Laundry detergent',
        'Стиральный порошок; powder or liquid that is used to wash clothes',
      ],
      [
        'Hostage',
        'Заложник; valuable prisoner who is supposed to be exchanged for smth',
      ],
      ['Thousand', 'Тысяча; number 1000, hundred times ten'],
      ['Prey', 'Добыча; animal which was hunted and killed for food'],
      ['Burner', 'Горелка; part of cooker that produces flame'],
      ['Tissue', 'Ткань, носовой платок; soft paper used to clean esp nose'],
      ['Sleeve', 'Рукав, чехол; part of clothes that covers the arm'],
      ['Poem', 'Стихотворение; writing form with lines and rhymes'],
      ['Leash', 'Поводок; piece of rope tied to an animal’s collar'],
      [
        'Gear',
        'Механизм, шестеренка, снаряжение; device with lots of details, wheel with teeth, equipment for particular activity',
      ],
      ['Stairs', 'Лестница; set of steps leading from one level to another'],
      ['Grave', 'Могила; place where a dead man is buried'],
      ['Witness', 'Свидетель; person who saw what happened, esp crime'],
      ['Weed', 'Сорняк; wild plant in unwanted places'],
    ],
    Animals: [
      [
        'Elephant',
        'Слон, большой серый с ушами и длинным носом; big ears and long nose',
      ],
      ['Tiger', 'Тигр, большой полосатый кот; big cat with stripes'],
      [
        'Squirrel',
        'Белка, маленькая, рыжая с пушистым хвостом; little animal with furry tail',
      ],
      [
        'Horse',
        'Лошадь, на ней ездят и ее запрягают; big animal, was used to ride on and carry things',
      ],
      ['Rhinoceros', 'Носорог; big gray animal with a horn on its nose'],
      ['Frog', 'Лягушка, зеленая, квакает; little, green, eats mosquitos'],
      [
        'Butterfly',
        'Бабочка, маленькая с яркими крыльями; small insect with colorful wings',
      ],
      [
        'Monkey',
        'Обезьяна, от нее произошел человек; funny animal who climbs the trees, human ancestor',
      ],
      ['Anteater', 'Муравьед, есть муравьев; animal who eats ants'],
      ['Eagle', 'Орел, хищная птица; meat eating bird, american coin'],
      ['Sparrow', 'Воробей, маленькая городская птичка; small city bird'],
      ['Moose', 'Лось, символ Скандинавии; symbol of Scandinavia'],
      ['Deer', 'Олень, Бэмби; Bambi'],
      ['Bear', 'Медведь, символ России; symbol of Russia'],
      ['Sloth', 'Ленивец, медленное животное; very slow animal'],
      ['Raccoon', 'Енот, полоскун; cute animal who washes your socks'],
      ['Turtle', 'Черепаха, животное с панцирем; hides in own shell'],
      ['Owl', 'Сова, ночная хищная птица; bird which hunts at night'],
    ],
    'Adverbs and expressions': [
      ['Thereby', 'Тем самым, таким образом; as a result of this action'],
      ['Throughout', 'На протяжении; during the whole period of time'],
      ['Surely', 'Разумеется; certainly'],
      ['Apart', 'Отдельно; separated'],
      ['Despite', 'Несмотря на, вопреки; not being influenced by'],
      ['Among', 'Среди; between, amid, surrounded'],
      ['During', 'В течение; from beginning to end of a time period'],
      [
        'Meantime',
        'Тем временем; until smth happens, while smth else is happening, meanwhile',
      ],
      ['Therefore', 'Поэтому, следовательно; for that reason, because'],
      ['Gee!', 'Ничего себе!; surprised or enthusiastic exclamation'],
      [
        'Further',
        'В дальнейшем, далше; to a greater distance or more advanced level',
      ],
      ['Exactly', 'Именно, точно; correctly, absolutely right, precisely'],
      ['Unfortunately', 'К сожалению; to express sadness or disappointment'],
      ['Regardless', 'Несмотря на, не считаясь с; despite, not influenced by'],
      [
        'Clockwise / counterclockwise',
        'По / против часовой стрелки; in the direction of the clock hands / opposite',
      ],
      ['Behalf', 'От имени; representing, for the good of smb'],
      ['Whatever', 'Что угодно, без разницы; not important, no difference'],
      ['Snug', 'Уютно; feeling warm, comfortable and protected, cosily'],
      ['Behind', 'Позади, сзади; at the back of smth'],
      ['Against', 'Против; disagreeing'],
      ['Gotcha', 'Попался!; Got you!'],
      ['Watcha!', 'Что ты (делаешь); What are (you doing)'],
      ['Probably', 'Возможно, вероятно; very likely, possibly'],
      ['Unless', 'Если не, пока не; except if'],
      ['Whether', 'Будь то; if or not'],
      ['Directly', 'Напрямую, непосредственно; without anything in between'],
      ['Indirectly', 'Косвенно; in a not obvious, complicated way'],
      ['Likewise', 'Также, подобно; in the same way'],
      ['Overall', 'В целом; in general'],
      [
        'Congratulations',
        'Поздравления, поздравляю!; expression used to show you’re glad and pleased with someone’s achievements, success or happiness',
      ],
      ['Thereby', 'Тем самым, таким образом; as a result of this action'],
    ],
    Outside: [
      ['Tree', 'Трава, зеленая под ногами; green, under your feet'],
      [
        'Building',
        'Здание, что-то построенное человеком; something built (house, church, factory)',
      ],
      ['Street', 'Улица, дорога с домами вдоль нее; road with houses along it'],
      [
        'Sidewalk',
        'Тротуар, часть дороги для пешеходов; part of a street for people',
      ],
      ['Streetlight', 'Уличный фонарь, светит на улице; lights outside'],
      [
        'Traffic light',
        'Светофор, регулирует движение машин; regulates traffic',
      ],
      [
        'Garden',
        'Сад, зеленый участок с деревьями и цветами; piece of land with trees and flowers',
      ],
      [
        'Alley',
        'Аллея, узкий проход между зданиями; path in a park with trees and bushes',
      ],
      ['Shopping mall', 'Торговый центр, центр шоппинга; large shopping area'],
      [
        'Statue',
        'Статуя, памятник; person or animal pictured in stone or metal',
      ],
      ['Museum', 'Музей, Зоологический, Эрмитаж; public place with artifacts'],
      [
        'Library',
        'Библиотека, место, где можно взять почитать книгу; public book collection',
      ],
      [
        'Grocery store',
        'Продуктовый магазин, продукты, товары для дома; store with food and small items for home',
      ],
      ['Cycling', 'Катание на велосипеде, велосипедный спорт; riding a bike'],
      ['Bicycle lane', 'Велодорожка; special part of a road for bicycles'],
      [
        'Playground',
        'Детская площадка, место для детских игр; place for kids to play',
      ],
      [
        'Stadium',
        'Стадион, спортивное сооружение; place for sport and public events',
      ],
      ['Walk', 'Гулять, прогулка; moving by foot'],
      [
        'Sights',
        'Достопримечательности, виды; views and places of interest, attractions',
      ],
      [
        'Public transport',
        'Публичный транспорт, автобусы-метро; subway-bus-tram',
      ],
      [
        'Traffic jam',
        'Пробка, затор в движении машин; many cars not moving or moving very slowly',
      ],
      ['Gas station', 'Заправка, заливать бензин; a place where fuel is sold'],
      ['Grass', 'Трава, зеленая под ногами; green, under your feet'],
    ],
  };
  return collections;
}
