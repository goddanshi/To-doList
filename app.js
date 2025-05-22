const express = require ('express');
const app = express();
const port = 3000;
require('dotenv').config();
const path = require('path')
const db = require ('./database.js')
const chatRouter = require('./chat.js');
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(chatRouter); // подключаем роуты из chat.js
app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');// Устанавливаем EJS как движок шаблонов
app.set('views', path.join(__dirname, 'views'));
app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM public.tasks');
    const arraytask = result.rows;
    res.render('index', {
      arraytask: arraytask
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});
app.post('/save-subtasks', async (req, res) => {
  try {
    const { newtask } = req.body;
    if (!newtask || newtask.trim() === '') {
      return res.status(400).send('Основная задача не может быть пустой');
    }

    // 1) Сохраняем основную задачу и получаем её ID
    const result = await db.query(
      'INSERT INTO tasks (task) VALUES ($1) RETURNING id',
      [newtask]
    );
    const parentTaskId = result.rows[0].id;

    // 2) Вызываем API Cohere (локально или через функцию)
    // Если хочешь, можешь вызвать внутренний маршрут /api/parse-task программно
    // Но проще — вынеси логику в отдельную функцию, например parseTaskToSubtasks(newtask)

    // Пример вызова Cohere напрямую (если у тебя есть доступ к cohere клиенту здесь)
    const { CohereClient } = require('cohere-ai');
    const cohere = new CohereClient({ apiKey: process.env.CO_API_KEY });
    const response = await cohere.generate({
      model: 'command-xlarge',
      prompt: `Разбей задачу "${newtask}" на подзадачи с дедлайнами, ответ напиши на русском языке.`,
      max_tokens: 300,
      temperature: 0.5,
    });
    const subtasksText = response.generations[0].text;

    // 3) Парсим подзадачи
    function parseSubtasks(text) {
      const regex = /\d+\.\s/g;
      const matches = text.match(regex);
      if (!matches) return [];
      const splits = text.split(regex).filter(s => s.trim() !== '');
      const ids = matches.map(s => parseInt(s));
      return splits.map((subtaskText, index) => ({
        id: ids[index],
        text: subtaskText.trim().replace(/\n/g, ' '),
      }));
    }
    const subtasks = parseSubtasks(subtasksText);

    // 4) Сохраняем подзадачи в БД в одной транзакции
    await db.query('BEGIN');
    for (const subtask of subtasks) {
      await db.query(
        'INSERT INTO tasks (parent_id, task_text) VALUES ($1, $2)',
        [parentTaskId, subtask.text]
      );
    }
    await db.query('COMMIT');

    res.json({ message: 'Основная задача и подзадачи успешно сохранены', parentTaskId, subtasksCount: subtasks.length });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Ошибка при сохранении задачи и подзадач:', err);
    res.status(500).json({ error: 'Ошибка при сохранении задачи и подзадач' });
  }
});
app.post('/', (req,res) => {
  newtask = req.body.newtask;
  if (newtask == '') {
    return res.send('<script>alert("Задача не может быть пустая"); window.location.href = "/";</script>');
  } else {
    db.query('INSERT INTO tasks (task) VALUES ($1) RETURNING *' , [newtask]) 
    res.redirect ('/')
}});

app.post('/delete/:id', async (req,res)=>{
  const id = req.params.id;
  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.redirect ('/');
})

app.post('/update/:id', async (req, res) => {
  const updatetask = req.body.updatetask;
  const taskId = req.params.id;

  if (!updatetask || updatetask.trim() === '') {
    return res.send('<script>alert("Задача не может быть пустой"); window.location.href = "/";</script>');
  }
  try {
    await db.query(
      'UPDATE tasks SET task = $1 WHERE id = $2 RETURNING *',
      [updatetask, taskId]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при обновлении задачи');
  }
});

app.listen(3000,()=>{
  console.log('server has been started')
});

