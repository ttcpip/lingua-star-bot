-bot-name = Lingua-Star bot

welcome =
  Привет, {$name}, добро пожаловать в {-bot-name}!
  У тебя { NUMBER($applesCount) ->
    [0] нет яблок
    [one] {$applesCount} яблоко
    *[other] {$applesCount} яблок
  }.