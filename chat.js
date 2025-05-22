const express = require('express');
const router = express.Router();
require('dotenv').config();

const { CohereClient } = require('cohere-ai');

console.log('COHERE_API_KEY:', process.env.CO_API_KEY);

const cohere = new CohereClient({
  apiKey: process.env.CO_API_KEY,
});

router.post('/api/parse-task', async (req, res) => {
  const newtask = req.body.newtask;

  if (!newtask || newtask.trim() === '') {
    return res.status(400).json({ error: 'Пустая задача' });
  }

  try {
    const response = await cohere.generate({
      model: 'command-xlarge',
      prompt: `Разбей следующую задачу на список подзадач с дедлайнами. Ответ напиши только на русском языке. Используй следующий формат:

      1. [Название подзадачи] — дедлайн: [примерный срок]
      2. ...
      
      Задача: "${newtask}"`,
      max_tokens: 600,
      temperature: 0.5,
    });
    console.log('Cohere response:', response);
    const result = response.generations[0].text;
    res.json({ subtasks: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обращении к Cohere' });
  }
});

module.exports = router;