const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // или import fetch из node-fetch, если нужно

require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

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

    // Парсим подзадачи из текста
    const parsedSubtasks = parseSubtasks(result);

    // Сохраняем в БД
    const client = await pool.connect();
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
    } finally {
      client.release();
    }

    // Возвращаем результат и подтверждение сохранения
    res.json({ subtasks: result, saved: parsedSubtasks.length });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Ошибка при обработке задачи' });
  }
});
module.exports = router;