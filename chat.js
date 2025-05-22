const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post('/api/parse-task', async (req, res) => {
  const userTask = req.body.task;

  if (!userTask || userTask.trim() === '') {
    return res.status(400).json({ error: 'Пустая задача' });
  }

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Ты помощник по управлению задачами.' },
        { role: 'user', content: `Разбей задачу "${userTask}" на подзадачи с дедлайнами.` }
      ]
    });

    const result = response.data.choices[0].message.content;
    res.json({ subtasks: result });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка при обращении к OpenAI' });
  }
});

module.exports = router;