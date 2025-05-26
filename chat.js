const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // или import fetch из node-fetch, если нужно
const client = require('./database');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
function parseSubtasks(responseText) {
  const lines = responseText.trim().split('\n');
  const subtasks = [];

  let counter = 1;

  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+?)\s*—\s*дедлайн:\s*(.+)$/i);
    if (match) {
      const title = match[1].trim();
      const deadline = match[2].trim();
      subtasks.push({
        id: counter++, // Просто автоинкремент
        task: `${title} — дедлайн: ${deadline}`
      });
    }
  }

  return subtasks;
}

router.post('/api/parse-task', async (req, res) => {
  const newtask = req.body.newtask;

  if (!newtask || newtask.trim() === '') {
    return res.status(400).json({ error: 'Пустая задача' });
  }

  try {
    // Запрос в OpenRouter
    const body = {
      model: "mistralai/mistral-7b-instruct",
      messages: [
        {
          role: "user",
          content: `Разбей следующую задачу на список подзадач с дедлайнами. Ответ напиши только на русском языке. Используй следующий формат:

1. [Название подзадачи] — дедлайн: [примерный срок]
2. ...
Задача: "${newtask}"`
        }
      ],
      stream: false
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', errText);
      return res.status(500).json({ error: 'Ошибка при обращении к OpenRouter.ai' });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    //Парсим подзадачи из текста
    const parsedSubtasks = parseSubtasks(result);

    // Сохраняем в БД
      try {
        await client.query('BEGIN');
        for (const { id, task } of parsedSubtasks) {
          await client.query(
            `INSERT INTO tasks (id, task) VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET task = EXCLUDED.task`,
            [id, task]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    // Возвращаем результат и подтверждение сохранения
    res.json({ subtasks: result, saved: parsedSubtasks.length });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Ошибка при обработке задачи' });
  }
});
module.exports = router;