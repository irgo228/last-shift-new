// Server-only game content derived verbatim from "Сайт викторина(1).docx".
// NEVER import this module into a Client Component: it contains answer keys.
export const QUESTIONS = Object.freeze([
  {
    number: 1,
    text: 'Почему давление в колонне и ёмкости растёт, несмотря на полностью открытые клапана по сбросу давления?',
    choices: [
      'Потому что закрыт клапан подачи орошения в колонну.',
      'Потому что закрыт клапан подачи воды в холодильник.',
      'Потому что закрыт клапан отвода жидкости из ёмкости.',
      'Потому что закрыт клапан отвода паров из колонны.',
    ],
    correct: 'Б',
    image: '/assets/q1-question.png',
    answerImage: '/assets/q1-answer.png',
  },
  {
    number: 2,
    text: 'Можно ли сейчас запускать насос?',
    choices: [
      'Нет, насос запускать нельзя — закрыт отсекатель Z-005.',
      'Нет, недостаточно уровня в емкости',
      'Да, всё в норме',
      'Нет, насос запускать нельзя — закрыт отсекатель Z-006.',
    ],
    correct: 'Г',
    image: '/assets/q2-question.png',
    answerImage: '/assets/q2-answer.png',
    // The normally closed Z-005 is a deliberate part of the start procedure.
  },
  {
    number: 3,
    text: 'Каким должно быть давление по отношению друг к другу в верху колонны и в рефлюксной ёмкости',
    choices: [
      'Давление должно быть одинаковым',
      'Давление в емкости должно быть выше',
      'Давление в верху колонны должно быть выше',
      'Не имеет значение',
    ],
    correct: 'В',
    image: '/assets/q3-question.png',
    answerImage: '/assets/q3-answer.png',
  },
]);

export const LABELS = Object.freeze(['А','Б','В','Г']);
export function publicQuestion(index, showCorrect = false) {
  const q = QUESTIONS[index];
  if (!q) return null;
  const result = { number: q.number, text: q.text, choices: q.choices.map((text,i) => ({id: LABELS[i],text})), image: q.image };
  if (showCorrect) { result.correct = q.correct; result.answerImage = q.answerImage; }
  return result;
}
